import { defineConfig } from 'vite';

// GitHub Pages serves this repository below its name, rather than at the host root.
export default defineConfig({
  base: '/breathwork-app/',
});
