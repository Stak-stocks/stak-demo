import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { createRouter, RouterProvider } from "@tanstack/react-router";
import { StrictMode } from "react";
import ReactDOM from "react-dom/client";

// Import the generated route tree
import { routeTree } from "./routeTree.gen";

import "./styles.css";
import { ThemeProvider } from "./components/ThemeProvider";
import { AuthProvider } from "./context/AuthContext";
import { AccountProvider } from "./context/AccountContext";


// Create a new router instance
const router = createRouter({
	routeTree,
	context: {},
	defaultPreload: "intent",
	scrollRestoration: false,
	defaultStructuralSharing: true,
	defaultPreloadStaleTime: 0,
	basepath: import.meta.env.TENANT_ID ? `/${import.meta.env.TENANT_ID}` : "/",
});

// Register the router instance for type safety
declare module "@tanstack/react-router" {
	interface Register {
		router: typeof router;
	}
}

// Render the app
const rootElement = document.getElementById("app");
if (rootElement && !rootElement.innerHTML) {
	const root = ReactDOM.createRoot(rootElement);
	root.render(
		<StrictMode>
			<ThemeProvider>
				<AuthProvider>
					<AccountProvider>
						<QueryClientProvider client={queryClient}>
							<RouterProvider router={router} />
						</QueryClientProvider>
					</AccountProvider>
				</AuthProvider>
			</ThemeProvider>
		</StrictMode>,
	);
}

