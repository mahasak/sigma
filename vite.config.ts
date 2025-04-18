import { vitePlugin as remix } from "@remix-run/dev";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

declare module "@remix-run/node" {
  interface Future {
    v3_singleFetch: true;
  }
}

export default defineConfig({
  plugins: [
    remix({
      future: {
        v3_fetcherPersist: true,
        v3_relativeSplatPath: true,
        v3_throwAbortReason: true,
        v3_singleFetch: true,
        v3_lazyRouteDiscovery: true,
      },
    }),
    tsconfigPaths(),
  ],
  server: {
    // ... any existing server options
    allowedHosts: [
      'overseas-ed-secretariat-arena.trycloudflare.com',
      'citysearch-passage-kazakhstan-future.trycloudflare.com',
      'graph.facebook.com',
      '*.facebook.com',
      // Keep any existing allowed hosts if present
    ]
  }
});
