import { resolve } from "node:path";
import tailwindcss from "@tailwindcss/vite";
import viteReact from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

// Unit test config — excludes TanStackRouterVite plugin to avoid
// auto code-splitting that wraps components in $$splitComponentImporter
export default defineConfig({
	plugins: [
		viteReact({
			jsxRuntime: "automatic",
		}),
		tailwindcss(),
	],
	resolve: {
		alias: {
			"@": resolve(import.meta.dirname, "./src"),
		},
	},
	test: {
		globals: true,
		environment: "jsdom",
		setupFiles: ["./vitest.setup.unit.js"],
	},
});
