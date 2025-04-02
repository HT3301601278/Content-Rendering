<template>
  <div class="chat-container">
    <div class="chat-messages" ref="messagesContainer">
      <div v-for="(message, index) in messages" :key="index" class="message" :class="message.role">
        <div class="message-content" v-html="renderContent(message.content)"></div>
      </div>
      <div v-if="isStreaming" class="message-streaming">
        <!-- 思考内容部分 -->
        <div v-if="streamingReasoningContent" class="message assistant reasoning">
          <div class="reasoning-header">思考过程</div>
          <div class="message-content" v-html="renderContent(streamingReasoningContent)"></div>
        </div>
        <!-- 正式内容部分 -->
        <div v-if="streamingContent" class="message assistant">
          <div class="message-content" v-html="renderContent(streamingContent)"></div>
        </div>
      </div>
    </div>

    <div class="chat-input">
      <textarea 
        v-model="userInput" 
        placeholder="请输入消息..." 
        @keydown.enter.prevent="sendMessage"
        :disabled="isStreaming"
      ></textarea>
      <button @click="sendMessage" :disabled="isStreaming || !userInput.trim()">发送</button>
    </div>
  </div>
</template>

<script>
import { ref, onMounted, nextTick } from 'vue';
import { initRouterContext, writeToStream, closeStream } from '../streamHandler.js';
import MarkdownIt from 'markdown-it';
import Katex from 'katex';
import 'katex/dist/katex.min.css';

export default {
  name: 'ChatView',
  setup() {
    const userInput = ref('');
    const messages = ref([
      { role: 'system', content: '智能助手' }
    ]);
    const isStreaming = ref(false);
    const streamingContent = ref('');
    const streamingReasoningContent = ref(''); // 新增：存储思考内容
    const messagesContainer = ref(null);
    
    // 创建Markdown解析器
    const md = new MarkdownIt({
      html: true,
      breaks: true,
      linkify: true,
      typographer: true
    });

    // 渲染内容函数（参考ContentRenderer的实现）
    const renderContent = (content) => {
      if (!content) return '';
      
      // 处理LaTeX内容
      let processedContent = content;
      
      // 替换双反斜杠为单反斜杠
      processedContent = processedContent.replace(/\\\\/g, '\\');
      
      // 处理boxed环境
      processedContent = processedContent.replace(/\\boxed\{([\s\S]*?)\}/g, '<div class="boxed">$1</div>');
      
      // 处理显示公式 $$ ... $$
      processedContent = processedContent.replace(/\$\$([\s\S]*?)\$\$/g, (match, formula) => {
        try {
          return Katex.renderToString(formula.trim(), { 
            displayMode: true,
            throwOnError: false,
            trust: true
          });
        } catch (e) {
          console.error('LaTeX显示公式渲染错误:', e);
          return `<div class="math-error">LaTeX显示公式渲染错误: ${e.message}</div>`;
        }
      });
      
      // 处理行内公式 $ ... $
      processedContent = processedContent.replace(/\$((?!\$)[\s\S]*?)\$/g, (match, formula) => {
        try {
          return Katex.renderToString(formula.trim(), { 
            displayMode: false,
            throwOnError: false,
            trust: true
          });
        } catch (e) {
          console.error('LaTeX行内公式渲染错误:', e);
          return `<span class="math-error">LaTeX行内公式渲染错误: ${e.message}</span>`;
        }
      });
      
      // 处理 \( ... \) 和 \[ ... \] 格式的公式
      processedContent = processedContent.replace(/\\\(([\s\S]*?)\\\)/g, (match, formula) => {
        try {
          return Katex.renderToString(formula.trim(), { 
            displayMode: false,
            throwOnError: false,
            trust: true
          });
        } catch (e) {
          console.error('LaTeX行内公式渲染错误:', e);
          return `<span class="math-error">LaTeX行内公式渲染错误: ${e.message}</span>`;
        }
      });
      
      processedContent = processedContent.replace(/\\\[([\s\S]*?)\\\]/g, (match, formula) => {
        try {
          return Katex.renderToString(formula.trim(), { 
            displayMode: true,
            throwOnError: false,
            trust: true
          });
        } catch (e) {
          console.error('LaTeX显示公式渲染错误:', e);
          return `<div class="math-error">LaTeX显示公式渲染错误: ${e.message}</div>`;
        }
      });
      
      // 渲染Markdown内容
      return md.render(processedContent);
    };

    // 滚动到底部
    const scrollToBottom = async () => {
      await nextTick();
      if (messagesContainer.value) {
        messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight;
      }
    };

    // 发送消息到API
    const sendMessage = async () => {
      if (!userInput.value.trim() || isStreaming.value) return;
      
      // 添加用户消息
      const userMessage = { role: 'user', content: userInput.value };
      messages.value.push(userMessage);
      userInput.value = '';
      scrollToBottom();
      
      // 开始流式接收
      isStreaming.value = true;
      streamingContent.value = '';
      streamingReasoningContent.value = ''; // 重置思考内容
      
      try {
        const response = await fetch('https://api.deepseek.com/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer sk-0893b211cd1c44448a5d14723273205b'
          },
          body: JSON.stringify({
            model: 'deepseek-reasoner',
            messages: messages.value,
            stream: true
          })
        });

        // 初始化路由上下文和流处理
        initRouterContext();
        
        // 处理流式响应
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          
          const chunk = decoder.decode(value, { stream: true });
          processChunk(chunk);
          
          // 滚动到底部
          scrollToBottom();
        }
        
        // 流结束，将累积的内容添加为消息
        if (streamingContent.value) {
          messages.value.push({ 
            role: 'assistant', 
            content: streamingContent.value,
            reasoning_content: streamingReasoningContent.value // 保存思考内容
          });
        }
        
        // 关闭流
        closeStream();
      } catch (error) {
        console.error('API请求错误:', error);
        messages.value.push({ role: 'system', content: '连接错误，请稍后重试' });
      } finally {
        isStreaming.value = false;
        scrollToBottom();
      }
    };

    // 处理API返回的数据块
    const processChunk = (chunk) => {
      // 按行分割数据
      const lines = chunk.split('\n').filter(line => line.trim().startsWith('data: '));
      
      for (const line of lines) {
        try {
          // 提取JSON数据
          const jsonData = line.substring(6); // 去掉 "data: " 前缀
          if (jsonData === '[DONE]') continue;
          
          const data = JSON.parse(jsonData);
          
          // 从delta中提取内容
          if (data.choices && data.choices[0].delta) {
            const delta = data.choices[0].delta;
            
            // 分别处理正式内容和思考内容
            if (delta.content !== null && delta.content !== undefined) {
              streamingContent.value += delta.content;
              // 使用streamHandler向流写入正式内容
              writeToStream(delta.content);
            }
            
            if (delta.reasoning_content !== null && delta.reasoning_content !== undefined) {
              streamingReasoningContent.value += delta.reasoning_content;
              // 也可以选择写入思考内容到流中
              // writeToStream(delta.reasoning_content);
            }
          }
        } catch (e) {
          console.error('解析数据错误:', e, line);
        }
      }
    };

    onMounted(() => {
      scrollToBottom();
    });

    return {
      userInput,
      messages,
      isStreaming,
      streamingContent,
      streamingReasoningContent, // 导出思考内容变量
      sendMessage,
      messagesContainer,
      renderContent // 导出渲染函数
    };
  }
}
</script>

<style>
/* 基础样式和重置 */
* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body {
  margin: 0;
  padding: 0;
  height: 100vh;
  background-color: #f5f7fa;
}

/* 主容器样式 */
.chat-container {
  display: flex;
  flex-direction: column;
  height: 90vh;
  max-width: 1000px;
  margin: 0 auto;
  padding: 2vh 20px;
  background-color: #f5f7fa;
  font-family: 'Helvetica Neue', Arial, sans-serif;
  color: #333;
  position: relative;
}

/* 聊天消息区域 */
.chat-messages {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  margin-bottom: 16px;
  border-radius: 12px;
  background-color: #fff;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.06);
  scrollbar-width: thin;
  scrollbar-color: #cbd5e0 #f8fafc;
  transition: all 0.3s ease;
  min-height: 0;
}

.chat-messages::-webkit-scrollbar {
  width: 6px;
}

.chat-messages::-webkit-scrollbar-track {
  background: #f8fafc;
  border-radius: 10px;
}

.chat-messages::-webkit-scrollbar-thumb {
  background-color: #cbd5e0;
  border-radius: 10px;
}

/* 消息气泡通用样式 */
.message {
  margin-bottom: 16px; /* 减小消息间距 */
  max-width: 85%;
  animation: fadeIn 0.3s ease-out;
  position: relative;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

/* 用户消息样式 */
.user {
  margin-left: auto;
  background: linear-gradient(135deg, #60a5fa, #3b82f6);
  color: white;
  border-radius: 18px 18px 4px 18px;
  padding: 12px 18px;
  box-shadow: 0 4px 15px rgba(59, 130, 246, 0.2);
}

/* 助手消息样式 */
.assistant {
  margin-right: auto;
  background-color: #fff;
  color: #1f2937;
  border-radius: 18px 18px 18px 4px;
  padding: 12px 18px;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.05);
  border: 1px solid #e5e7eb;
}

/* 系统消息样式 */
.system {
  background-color: #fef3c7;
  margin: 10px auto;
  font-style: italic;
  max-width: 90%;
  text-align: center;
  border-radius: 12px;
  padding: 10px 16px;
  box-shadow: 0 4px 6px rgba(251, 191, 36, 0.1);
  border-left: 4px solid #f59e0b;
}

/* 思考内容样式 */
.reasoning {
  background-color: #f0fdf4;
  border: 1px dashed #86efac;
  margin-bottom: 16px;
  border-radius: 14px;
  position: relative;
  overflow: hidden;
}

.reasoning::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: linear-gradient(45deg, rgba(134, 239, 172, 0.1) 25%, transparent 25%, transparent 50%, rgba(134, 239, 172, 0.1) 50%, rgba(134, 239, 172, 0.1) 75%, transparent 75%);
  background-size: 8px 8px;
  opacity: 0.3;
}

.reasoning-header {
  font-size: 12px;
  color: #16a34a;
  margin-bottom: 6px;
  font-weight: 600;
  letter-spacing: 0.02em;
  text-transform: uppercase;
}

/* 流式输出区域 */
.message-streaming {
  position: relative;
  padding-bottom: 10px;
}

.message-streaming::after {
  content: "";
  position: absolute;
  bottom: 0;
  left: 0;
  width: 100%;
  height: 2px;
  background: linear-gradient(90deg, transparent, #3b82f6, transparent);
  animation: loading 1.5s infinite;
}

@keyframes loading {
  0% { transform: translateX(-100%); }
  100% { transform: translateX(100%); }
}

/* 消息内容样式 */
.message-content {
  line-height: 1.6;
  font-size: 15px;
}

/* 输入区域样式 */
.chat-input {
  flex-shrink: 0;
  display: flex;
  gap: 12px;
  padding: 12px;
  background-color: #fff;
  border-radius: 12px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.06);
  position: relative;
  transition: all 0.3s ease;
  height: 74px;
}

.chat-input:focus-within {
  box-shadow: 0 8px 30px rgba(59, 130, 246, 0.15);
}

textarea {
  flex: 1;
  padding: 12px 16px;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  resize: none;
  height: 50px;
  font-family: inherit;
  font-size: 15px;
  background-color: #f9fafb;
  transition: all 0.2s ease;
  line-height: 1.4;
}

textarea:focus {
  outline: none;
  border-color: #93c5fd;
  background-color: #fff;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

textarea::placeholder {
  color: #9ca3af;
}

button {
  padding: 0 24px;
  background-color: #3b82f6;
  color: white;
  border: none;
  border-radius: 10px;
  cursor: pointer;
  font-weight: 500;
  font-size: 15px;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
}

button:hover {
  background-color: #2563eb;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.2);
}

button:active {
  transform: translateY(1px);
  box-shadow: 0 2px 6px rgba(59, 130, 246, 0.2);
}

button:disabled {
  background-color: #cbd5e0;
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
}

/* 内容渲染样式 */
.message-content blockquote {
  margin: 12px 0;
  padding-left: 16px;
  border-left: 4px solid #93c5fd;
  color: #4b5563;
  background-color: rgba(236, 252, 255, 0.3);
  padding: 8px 12px;
  border-radius: 0 6px 6px 0;
}

.message-content code {
  background-color: #f1f5f9;
  padding: 2px 6px;
  border-radius: 4px;
  font-family: 'Menlo', 'Monaco', 'Courier New', monospace;
  font-size: 0.9em;
  color: #ef4444;
}

.message-content pre {
  background-color: #1e293b;
  color: #e2e8f0;
  padding: 16px;
  border-radius: 8px;
  overflow-x: auto;
  margin: 16px 0;
  font-family: 'Menlo', 'Monaco', 'Courier New', monospace;
  font-size: 0.9em;
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.15);
}

.message-content pre code {
  background-color: transparent;
  padding: 0;
  color: inherit;
}

.message-content h1,
.message-content h2,
.message-content h3,
.message-content h4 {
  margin-top: 24px;
  margin-bottom: 16px;
  color: #1e3a8a;
  font-weight: 600;
  line-height: 1.3;
}

.message-content h1 {
  font-size: 1.5em;
  padding-bottom: 8px;
  border-bottom: 2px solid #e2e8f0;
}

.message-content h2 {
  font-size: 1.3em;
}

.message-content h3 {
  font-size: 1.15em;
}

.message-content h4 {
  font-size: 1em;
}

.message-content p {
  margin-bottom: 16px;
}

.message-content a {
  color: #2563eb;
  text-decoration: none;
  border-bottom: 1px solid currentColor;
  transition: all 0.2s ease;
}

.message-content a:hover {
  color: #1d4ed8;
  border-bottom-width: 2px;
}

.message-content ul,
.message-content ol {
  margin: 16px 0;
  padding-left: 32px;
}

.message-content li {
  margin-bottom: 8px;
}

.message-content table {
  border-collapse: collapse;
  width: 100%;
  margin: 16px 0;
  background-color: white;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.message-content th,
.message-content td {
  border: 1px solid #e5e7eb;
  padding: 10px 16px;
  text-align: left;
}

.message-content th {
  background-color: #f3f4f6;
  font-weight: 500;
}

.message-content tr:nth-child(even) {
  background-color: #f9fafb;
}

/* 数学公式错误信息 */
.math-error {
  color: #b91c1c;
  background-color: #fee2e2;
  padding: 8px 12px;
  border-radius: 6px;
  margin: 8px 0;
  border-left: 3px solid #ef4444;
  font-size: 0.9em;
}

/* LaTeX专用样式 */
.boxed {
  border: 1px solid #cbd5e0;
  padding: 16px;
  margin: 16px 0;
  border-radius: 8px;
  background-color: #f8fafc;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.05);
}

/* 特殊环境样式 */
.theorem, .proof, .definition, .example, .note {
  margin: 16px 0;
  padding: 16px;
  border-radius: 8px;
  position: relative;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.theorem {
  background-color: #eff6ff;
  border-left: 4px solid #3b82f6;
}

.proof {
  background-color: #ecfdf5;
  border-left: 4px solid #10b981;
}

.definition {
  background-color: #fffbeb;
  border-left: 4px solid #f59e0b;
}

.example {
  background-color: #f5f3ff;
  border-left: 4px solid #8b5cf6;
}

.note {
  background-color: #fef2f2;
  border-left: 4px solid #ef4444;
}

/* 响应式调整 */
@media (max-width: 768px) {
  .chat-container {
    padding: 1vh 12px;
  }
  
  .chat-messages {
    height: calc(98vh - 100px);
    padding: 12px;
  }
  
  .chat-input {
    height: 64px;
    padding: 8px;
  }
  
  textarea {
    height: 45px;
    padding: 10px 14px;
  }
  
  button {
    padding: 0 16px;
  }
}

/* 动画效果 */
.message-content img,
.message-content iframe {
  max-width: 100%;
  border-radius: 8px;
  margin: 16px 0;
  transition: transform 0.3s ease;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.message-content img:hover,
.message-content iframe:hover {
  transform: scale(1.02);
}

/* 用户消息中的内容要适应深色背景 */
.user .message-content {
  color: white;
}

.user .message-content code {
  background-color: rgba(255, 255, 255, 0.2);
  color: #fff;
}

.user .message-content a {
  color: #fff;
  border-bottom-color: rgba(255, 255, 255, 0.5);
}

.user .message-content a:hover {
  border-bottom-color: #fff;
}
</style>
