import Vue from 'vue'
import App from './App.vue'
import router from './router'
import store from './store'
import 'katex/dist/katex.min.css'
import VueMarkdownIt from 'vue-markdown-it'
import VueKatex from 'vue-katex'
import VueMathjax from 'vue-mathjax'

Vue.use(VueMarkdownIt)
Vue.use(VueKatex)
Vue.use(VueMathjax, {
  src: 'https://cdnjs.cloudflare.com/ajax/libs/mathjax/2.7.7/MathJax.js?config=TeX-AMS_HTML'
})

Vue.config.productionTip = false

new Vue({
  router,
  store,
  render: h => h(App)
}).$mount('#app')
