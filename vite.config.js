import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    // Offline-tolerant PWA: the app shell (html/css/main js) is precached so
    // the app opens on a site with no signal. The heavy on-demand chunks
    // (jspdf, html2canvas, qrcode) are NOT precached — a tradie's phone never
    // downloads PDF code it won't use; they cache on first real use instead.
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg'],
      manifest: {
        name: 'OHS Builder Victoria',
        short_name: 'OHS Builder',
        description: 'Site safety compliance for Victorian builders',
        theme_color: '#1e3a8a',
        background_color: '#0f172a',
        display: 'standalone',
        start_url: '/',
        icons: [
          { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
        ],
      },
      workbox: {
        navigateFallback: '/index.html',
        // Never answer an asset or API request with the app shell. Without
        // this, a request for a chunk that no longer exists comes back as
        // index.html with a 200 — HTML that the browser then tries to run as
        // JavaScript, which is a blank page.
        navigateFallbackDenylist: [/^\/assets\//, /^\/api\//],
        globPatterns: ['**/*.{css,html,svg,png,ico}', 'assets/index-*.js'],
        globIgnores: ['**/jspdf*', '**/html2canvas*', '**/purify*', '**/index.es-*', '**/browser-*', '**/typeof-*'],
        // Anything not precached (the lazy chunks) caches on first use.
        //
        // StaleWhileRevalidate rather than CacheFirst, deliberately. After a
        // deploy, a returning client can hold an index.html referencing a hash
        // the server no longer has; the origin answers that URL with the SPA
        // fallback (200 + HTML). CacheFirst would store that HTML under the
        // JS URL and keep serving it forever — a white screen that only
        // clearing site data fixes. StaleWhileRevalidate re-fetches in the
        // background, so the same mistake heals itself on the next load.
        // The assets are content-hashed, so the revalidation is cheap.
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.pathname.startsWith('/assets/'),
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'lazy-assets',
              expiration: { maxEntries: 40 },
              cacheableResponse: { statuses: [200] },
            },
          },
        ],
      },
    }),
  ],
})
