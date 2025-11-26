import { createRouter, createWebHistory } from 'vue-router';
import Chat from '../views/Chat.vue';
import Login from '../views/Login.vue';
import ForgotPassword from '../views/ForgotPassword.vue';
import ResetPassword from '../views/ResetPassword.vue';

const routes = [
  {
    path: '/',
    name: 'Chat',
    component: Chat,
    meta: { requiresAuth: true }
  },
  {
    path: '/login',
    name: 'Login',
    component: Login,
    meta: { requiresAuth: false }
  },
  {
    path: '/forgot-password',
    name: 'ForgotPassword',
    component: ForgotPassword,
    meta: { requiresAuth: false }
  },
  {
    path: '/reset-password',
    name: 'ResetPassword',
    component: ResetPassword,
    meta: { requiresAuth: false }
  }
];

const router = createRouter({
  history: createWebHistory(),
  routes
});

// Guard pour vérifier l'authentification
router.beforeEach(async (to, from, next) => {
  const requiresAuth = to.matched.some(record => record.meta.requiresAuth);
  
  // Vérifier si l'utilisateur a un cookie de session
  const hasSession = document.cookie.includes('token=');
  
  if (requiresAuth && !hasSession) {
    next('/login');
  } else if (!requiresAuth && hasSession && to.path === '/login') {
    next('/');
  } else {
    next();
  }
});

export default router;
