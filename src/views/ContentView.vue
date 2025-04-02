<template>
  <div class="content-view">
    <h1>内容渲染器</h1>
    
    <div class="controls">
      <div class="file-selector">
        <label>选择要显示的文件：</label>
        <select v-model="selectedFile" @change="loadContent">
          <option v-for="file in availableFiles" :key="file.name" :value="file.name">
            {{ file.label }}
          </option>
        </select>
      </div>
    </div>
    
    <ContentRenderer :jsonFile="selectedFile" />
  </div>
</template>

<script>
import ContentRenderer from '@/components/ContentRenderer.vue';

export default {
  name: 'ContentView',
  components: {
    ContentRenderer
  },
  data() {
    return {
      selectedFile: 'cos.json',
      availableFiles: [
        { name: 'cos.json', label: '余弦函数' },
        { name: 'cos2.json', label: '余弦函数2' },
        { name: 'sin.json', label: '正弦函数' },
        { name: 'sin2.json', label: '正弦函数2' },
        { name: 'comparison.json', label: '比较' },
        { name: 'chinese.json', label: '中文内容' },
        { name: 'american.json', label: '美国内容' }
      ]
    };
  },
  methods: {
    loadContent() {
      // 选择文件变化时可以添加处理逻辑
      console.log(`加载文件: ${this.selectedFile}`);
    }
  }
};
</script>

<style scoped>
.content-view {
  max-width: 1000px;
  margin: 0 auto;
  padding: 20px;
}

h1 {
  text-align: center;
  margin-bottom: 30px;
  color: #2c3e50;
}

.controls {
  margin-bottom: 20px;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  gap: 20px;
}

.file-selector {
  display: flex;
  align-items: center;
  gap: 10px;
}

select {
  padding: 8px 12px;
  border-radius: 4px;
  border: 1px solid #ddd;
  background-color: white;
  font-size: 16px;
  cursor: pointer;
}

select:focus {
  outline: none;
  border-color: #42b983;
  box-shadow: 0 0 0 2px rgba(66, 185, 131, 0.2);
}
</style> 