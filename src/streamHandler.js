/**
 * 流式输出处理模块
 */

// 初始化路由上下文
function initRouterContext() {
  window.__reactRouterContext = {
    "basename": "/",
    "future": {
      "unstable_optimizeDeps": false
    },
    "isSpaMode": false
  };
  
  // 创建流式处理
  setupStreamHandler();
}

// 设置流式处理
function setupStreamHandler() {
  // 创建ReadableStream用于处理流式数据
  window.__reactRouterContext.stream = new ReadableStream({
    start(controller) {
      // 存储控制器以便后续使用
      window.__reactRouterContext.streamController = controller;
    }
  }).pipeThrough(new TextEncoderStream());
}

// 示例：向流中写入数据
function writeToStream(data) {
  if (window.__reactRouterContext && window.__reactRouterContext.streamController) {
    window.__reactRouterContext.streamController.enqueue(data);
  }
}

// 示例：关闭流
function closeStream() {
  if (window.__reactRouterContext && window.__reactRouterContext.streamController) {
    window.__reactRouterContext.streamController.close();
  }
}

// 导出函数
export {
  initRouterContext,
  setupStreamHandler,
  writeToStream,
  closeStream
}; 