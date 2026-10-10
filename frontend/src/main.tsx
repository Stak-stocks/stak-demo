import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { createRouter, RouterProvider } from "@tanstack/react-router";
import { StrictMode } from "react";
import ReactDOM from "react-dom/client";

// Import the generated route tree
import { routeTree } from "./routeTree.gen";

import "./styles.css";
import { Analytics } from "@vercel/analytics/react";
import { ThemeProvider } from "./components/ThemeProvider";
import { AuthProvider } from "./context/AuthContext";
import { AccountProvider } from "./context/AccountContext";
import { OnboardingProvider } from "./context/OnboardingContext";
import { applyTeamCode, takeTeamCodeFromUrl } from "./lib/earlyAccess";

// A team link's code comes out of the address before the router reads it (see earlyAccess.ts).
const teamCode = takeTeamCodeFromUrl();

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

function render(rootElement: HTMLElement) {
	const root = ReactDOM.createRoot(rootElement);
	root.render(
		<StrictMode>
			<ThemeProvider>
				<AuthProvider>
					<AccountProvider>
						<OnboardingProvider>
							<QueryClientProvider client={queryClient}>
								<RouterProvider router={router} />
								<Analytics />
							</QueryClientProvider>
						</OnboardingProvider>
					</AccountProvider>
				</AuthProvider>
			</ThemeProvider>
		</StrictMode>,
	);
}

// Render the app, once a team link (if this was one) has unlocked or locked the web.
const rootElement = document.getElementById("app");
if (rootElement && !rootElement.innerHTML) {
	void applyTeamCode(teamCode).then(() => render(rootElement));
}

