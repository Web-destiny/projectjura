import { createApp } from 'vue';
import { createPinia } from 'pinia';
import '@fontsource/onest/400.css';
import '@fontsource/onest/500.css';
import '@fontsource/onest/600.css';
import './app/theme/tokens.css';
import App from './App.vue';
import { router } from './app/router';
const app = createApp(App);
app.use(createPinia()).use(router);
app.config.errorHandler = () => {
  window.dispatchEvent(new Event('dzhura-error'));
};
app.mount('#app');
