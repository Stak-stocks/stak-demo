import { auth } from "./firebase";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:3001";

async function getAuthToken(): Promise<string | null> {
	const user = auth.currentUser;
	if (!user) return null;
	return user.getIdToken();
}

async function apiRequest<T>(
	endpoint: string,
	options: RequestInit = {},
): Promise<T> {
	const token = await getAuthToken();

	const headers: Record<string, string> = {
		"Content-Type": "application/json",
		...((options.headers as Record<string, string>) || {}),
	};

	if (token) {
		headers.Authorization = `Bearer ${token}`;
	}

	const response = await fetch(`${API_BASE_URL}${endpoint}`, {
		...options,
		headers,
	});

	if (!response.ok) {
		throw new Error(`API error: ${response.status} ${response.statusText}`);
	}

	return response.json();
}

// User profile
export function getProfile() {
	return apiRequest<{ uid: string; email: string; displayName: string; preferences: Record<string, unknown> & { interests?: string[] }; onboardingCompleted?: boolean }>("/api/me");
}

export function updateProfile(data: { displayName?: string; preferences?: Record<string, unknown> & { interests?: string[] }; onboardingCompleted?: boolean }) {
	return apiRequest("/api/me", {
		method: "PUT",
		body: JSON.stringify(data),
	});
}

// Brands
export function getBrands() {
	return apiRequest<{ brands: unknown[] }>("/api/brands");
}

// Stak
export function getStak() {
	return apiRequest<{ brandIds: string[] }>("/api/me/stak");
}

export function saveStak(brandIds: string[]) {
	return apiRequest("/api/me/stak", {
		method: "PUT",
		body: JSON.stringify({ brandIds }),
	});
}

// Passed brands (left-swiped)
export function getPassedBrands() {
	return apiRequest<{ entries: { id: string; at: number }[] }>("/api/me/passed");
}

export function savePassedBrands(entries: { id: string; at: number }[]) {
	return apiRequest("/api/me/passed", {
		method: "PUT",
		body: JSON.stringify({ entries }),
	});
}

// Swipe
export function recordSwipe(brandId: string, direction: "left" | "right") {
	return apiRequest("/api/swipe", {
		method: "POST",
		body: JSON.stringify({ brandId, direction }),
	});
}

// Live Trends (Gemini-generated, cached 3 days in Firestore)
export function getLiveTrends(brandId: string, ticker: string, name: string) {
	return apiRequest<{ cards: import("@/data/brands").TrendCard[]; brandId: string }>(
		`/api/trends/${brandId}?ticker=${encodeURIComponent(ticker)}&name=${encodeURIComponent(name)}`,
	);
}

// News
export function getCompanyNews(symbol: string, name?: string) {
	const query = name ? `?name=${encodeURIComponent(name)}` : "";
	return apiRequest<{ articles: import("@/data/brands").NewsArticle[] }>(`/api/news/company/${symbol}${query}`);
}

export function getMarketNews() {
	return apiRequest<{ articles: import("@/data/brands").NewsArticle[] }>("/api/news/market");
}

export function searchNews(query: string) {
	return apiRequest<{ articles: import("@/data/brands").NewsArticle[] }>(
		`/api/news/search?q=${encodeURIComponent(query)}`,
	);
}

export function getIntelCards() {
	return apiRequest<{ cards: import("@/data/intelCards").IntelCard[] | null }>("/api/intel-cards");
}

export function getIntelState() {
	return apiRequest<{ lastDate: string; queue: string[]; readIds: string[] }>("/api/me/intel-state");
}

export function saveIntelState(lastDate: string, queue: string[], readIds: string[]) {
	return apiRequest("/api/me/intel-state", {
		method: "PUT",
		body: JSON.stringify({ lastDate, queue, readIds }),
	});
}

export interface LiveQuote {
	price: number;
	change: number;
	changePercent: number;
	high: number;
	low: number;
	open: number;
	prevClose: number;
}

export interface LiveMetrics {
	peRatio: number | null;
	marketCap: string | null;
	revenueGrowth: string | null;
	profitMargin: string | null;
	beta: number | null;
	dividendYield: string | null;
	week52High: number | null;
	week52Low: number | null;
}

export function getStockData(symbol: string) {
	return apiRequest<{ quote: LiveQuote | null; metrics: LiveMetrics }>(`/api/stock/${encodeURIComponent(symbol)}`);
}
