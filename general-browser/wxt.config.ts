import { defineConfig } from 'wxt';
import { resolve } from 'path';

// See https://wxt.dev/api/config.html
export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  srcDir: 'src',
  alias: {
    '@': resolve(__dirname, './src'),
  },
  manifest: {
    name: 'GENESIS AI Browser Assistant',
    description: 'AI-powered browser assistant that helps you with tasks',
    permissions: ['storage', 'tabs', 'scripting'],
    host_permissions: ['https://mail.google.com/*'],
    action: {
      default_title: 'Toggle GENESIS AI Assistant',
    },
  },
});
