import Vue from 'vue'
import VueRouter from 'vue-router'
import ContentView from '../views/ContentView.vue'
import ChatView from '../views/ChatView.vue'

Vue.use(VueRouter)

const routes = [
  {
    path: '/',
    name: 'content',
    component: ContentView
  },
  {
    path: '/chat',
    name: 'chat',
    component: ChatView
  }
]

const router = new VueRouter({
  routes
})

export default router
