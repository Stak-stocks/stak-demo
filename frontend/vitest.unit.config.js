import { resolve } from "node:path";
import { defineConfig } from "vitest/config";
import viteReact from "@vitejs/plugin-react";

export default defineConfig({
	plugins: [viteReact({ jsxRuntime: "automatic" })],
	resolve: {
		alias: {
			"@": resolve(__dirname, "./src"),
			"@stak/shared": resolve(__dirname, "../shared/src"),
		},
	},
	test: {
		globals: true,
		environment: "jsdom",
		setupFiles: ["./src/test-setup.ts"],
	},
});
