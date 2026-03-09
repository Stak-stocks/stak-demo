import { resolve } from "node:path";
import tailwindcss from "@tailwindcss/vite";
import { TanStackRouterVite } from "@tanstack/router-plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import svgr from "vite-plugin-svgr";

// https://vitejs.dev/config/
export default defineConfig({
	base: process.env.TENANT_ID ? `/${process.env.TENANT_ID}/` : "/",
	define: {
		"import.meta.env.TENANT_ID": JSON.stringify(process.env.TENANT_ID || ""),
	},
	plugins: [
		TanStackRouterVite({
			autoCodeSplitting: true,
		}),
		viteReact({
			jsxRuntime: "automatic",
		}),
		svgr(),
		tailwindcss(),
	],
	resolve: {
		alias: {
			"@": resolve(__dirname, "./src"),
		},
	},
	server: {
		host: "0.0.0.0",
		port: 3000,
		allowedHosts: true, // respond to *any* Host header
		headers: {
			"Cross-Origin-Opener-Policy": "same-origin-allow-popups",
			"Cross-Origin-Embedder-Policy": "unsafe-none",
		},
		watch: {
			usePolling: true,
			interval: 300, // ms; tune if CPU gets high
		},
	},
	build: {
		chunkSizeWarningLimit: 1500,
		rollupOptions: {
			output: {
				manualChunks: {
					"brands-data": ["./src/data/brands.ts"],
				},
			},
		},
	},
});
