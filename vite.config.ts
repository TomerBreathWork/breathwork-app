import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

// GitHub Pages serves this repository below its name, rather than at the host root.
export default defineConfig({
  base: "/breathwork-app/",
  // Retain upstream MIT notices in the distributed, minified audio implementation.
  esbuild: { legalComments: "inline" },
  plugins: [
    VitePWA({
      strategies: "injectManifest",
      srcDir: "src",
      filename: "service-worker.ts",
      // Registration and activation are controlled by the practice-aware client.
      injectRegister: false,
      registerType: "prompt",
      scope: "/breathwork-app/",
      manifest: false,
      injectManifest: {
        globPatterns: [
          "**/*.{html,js,css,json,webmanifest,svg,png,ico,webp,jpg,jpeg,mp3,MP3,wav,ogg,woff,woff2}",
        ],
        maximumFileSizeToCacheInBytes: 10 * 1024 * 1024,
      },
      // A dev server changes assets without building a matching precache.
      devOptions: { enabled: false },
    }),
  ],
});
