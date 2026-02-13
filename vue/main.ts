import { createApp } from 'vue';

import '../src/styles/theme.scss';
import App from './App.vue';
import router from './router';

createApp(App).use(router).mount('#app');
