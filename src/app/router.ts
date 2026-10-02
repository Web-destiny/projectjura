import { createRouter, createWebHistory } from 'vue-router';
export const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    { path: '/', component: () => import('../pages/HomePage.vue') },
    { path: '/create', component: () => import('../pages/CreateDocumentPage.vue') },
    { path: '/edit', component: () => import('../pages/EditDocumentsPage.vue') },
    { path: '/templates', component: () => import('../pages/TemplatesPage.vue') },
    { path: '/guide', component: () => import('../pages/GuidePage.vue') },
    { path: '/:pathMatch(.*)*', component: () => import('../pages/NotFoundPage.vue') },
  ],
  scrollBehavior: () => ({ top: 0 }),
});
