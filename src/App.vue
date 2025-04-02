<template>
  <div id="app">
    <nav class="nav-menu">
      <router-link to="/" class="nav-link">内容渲染</router-link>
      <router-link to="/chat" class="nav-link">AI对话</router-link>
    </nav>
    <router-view/>
  </div>
</template>

<style>
html, body {
  height: 100%;
  margin: 0;
  padding: 0;
  overflow: hidden; /* 阻止全局滚动条 */
}

#app {
  font-family: Avenir, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  color: #2c3e50;
  height: 100%;
  overflow: hidden; /* 阻止app容器滚动条 */
}

.nav-menu {
  display: flex;
  justify-content: center;
  padding: 15px;
  background-color: #f8f8f8;
  border-bottom: 1px solid #e0e0e0;
}

.nav-link {
  margin: 0 15px;
  padding: 8px 16px;
  color: #2c3e50;
  text-decoration: none;
  border-radius: 4px;
  font-weight: bold;
  transition: all 0.3s ease;
}

.nav-link:hover {
  background-color: #e3f2fd;
}

.router-link-active {
  background-color: #2196f3;
  color: white;
}
</style>
