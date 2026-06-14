import { defineConfig } from 'wxt';

// See https://wxt.dev/api/config.html
export default defineConfig({
  srcDir: 'src',
  manifest: {
    permissions: ['contextMenus', 'storage'],
    host_permissions: ['<all_urls>'],
    name: 'Alty',
    description: 'Generate alt text for images on the web using AI.',
    icons: {
      "16": "icon-16.png",
      "32": "icon-32.png",
      "48": "icon-48.png",
      "128": "icon-128.png"
    },
    web_accessible_resources: [
      {
        resources: ['icon-32.png'],
        matches: ['<all_urls>']
      }
    ],
    browser_specific_settings: {
      gecko: {
        id: "alty@extension"
      }
    }
  },
});
