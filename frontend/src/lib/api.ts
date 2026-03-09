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
	return apiRequest<{ uid: string; email: string; displayName: string; phone?: string; preferences: Record<string, unknown> & { interests?: string[] }; onboardingCompleted?: boolean }>("/api/me");
}

export function updateProfile(data: { displayName?: string; phone?: string; preferences?: Record<string, unknown> & { interests?: string[] }; onboardingCompleted?: boolean }) {
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
export function recordSwipe(
	brandId: string,
	direction: "left" | "right",
	meta?: { ticker?: string; categories?: string[]; stakSize?: number; timeOnCardMs?: number; swipeVelocity?: number },
) {
	return apiRequest("/api/swipe", {
		method: "POST",
		body: JSON.stringify({ brandId, direction, ...meta }),
	});
}

export function recordEngagement(
	type: "learn_more" | "removed_from_stak",
	brandId: string,
	meta?: { ticker?: string; categories?: string[] },
) {
	return apiRequest("/api/swipe/event", {
		method: "POST",
		body: JSON.stringify({ type, brandId, ...meta }),
	});
}

// Live Trends (Gemini-generated, cached 3 days in Firestore)
export function getLiveTrends(brandId: string, ticker: string, name: string) {
	return apiRequest<{ cards: import("@/data/brands").TrendCard[]; brandId: string }>(
		`/api/trends/${brandId}?ticker=${encodeURIComponent(ticker)}&name=${encodeURIComponent(name)}`,
	);
}

// News
export interface EarningsSignal {
	status: "upcoming" | "beat" | "miss" | "none";
	date: string | null;
}

export function getCompanyNews(symbol: string, name?: string) {
	const query = name ? `?name=${encodeURIComponent(name)}` : "";
	return apiRequest<{
		articles: import("@/data/brands").NewsArticle[];
		earningsSignal: EarningsSignal;
	}>(`/api/news/company/${symbol}${query}`);
}

export function getMarketNews() {
	return apiRequest<{ articles: import("@/data/brands").NewsArticle[] }>("/api/news/market");
}

export function searchNews(query: string) {
	return apiRequest<{ articles: import("@/data/brands").NewsArticle[] }>(
		`/api/news/search?q=${encodeURIComponent(query)}`,
	);
}

export interface DynamicVibes {
	ticker: string;
	internetHype: number | null;
	dramaLevel: number | null;
	clout: number | null;
}

export function getVibes(ticker: string) {
	return apiRequest<DynamicVibes>(`/api/vibes/${encodeURIComponent(ticker)}`);
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

export function getDeckOrder() {
	return apiRequest<{ order: string[] }>("/api/me/deck-order");
}

export function saveDeckOrder(order: string[]) {
	return apiRequest("/api/me/deck-order", {
		method: "PUT",
		body: JSON.stringify({ order }),
	});
}

export function getDailySwipeCount() {
	return apiRequest<{ date: string; count: number }>("/api/me/daily-swipes");
}

export function saveDailySwipeCount(date: string, count: number) {
	return apiRequest("/api/me/daily-swipes", {
		method: "PUT",
		body: JSON.stringify({ date, count }),
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

export interface CalendarEntry {
	symbol: string;
	date: string;
	hour: string;
	epsActual: number | null;
	epsEstimate: number | null;
	revenueActual: number | null;
	revenueEstimate: number | null;
}

export function getEarningsCalendar() {
	return apiRequest<{
		today: CalendarEntry[];
		tomorrow: CalendarEntry[];
		week: CalendarEntry[];
	}>("/api/stock/calendar");
}

export function getStockData(symbol: string) {
	return apiRequest<{ quote: LiveQuote | null; metrics: LiveMetrics }>(`/api/stock/${encodeURIComponent(symbol)}`);
}

export interface MarketEarningsEntry {
	symbol: string;
	name: string;
	date: string;
	hour: string | null;
	epsActual: number | null;
	epsEstimate: number | null;
	epsSurprisePct: number | null;
	priceChangePct: number | null;
	revChangePct: number | null;
	status: "beat" | "miss" | "upcoming" | "none";
}

export function getMarketEarnings(period: "today" | "tomorrow" | "week", extraTickers?: string[]) {
	const tickersQs = extraTickers && extraTickers.length > 0 ? `&tickers=${extraTickers.join(",")}` : "";
	return apiRequest<{ entries: MarketEarningsEntry[]; from: string; to: string }>(
		`/api/stock/market-earnings?period=${period}${tickersQs}`,
	);
}

export function getEarnings(symbol: string, name?: string) {
	const qs = name ? `?name=${encodeURIComponent(name)}` : "";
	return apiRequest<{
		status: "upcoming" | "beat" | "miss" | "none";
		date: string | null;
		hour?: string;
	}>(`/api/stock/${encodeURIComponent(symbol)}/earnings${qs}`);
}

// Dynamic IPO-detected stocks (from Firestore, auto-populated every 2 days)

// Module-level cache — populated on first fetch, readable synchronously by any component
let _dynamicStocksCache: import("@/data/brands").BrandProfile[] = [];

export function getCachedDynamicStocks(): import("@/data/brands").BrandProfile[] {
	return _dynamicStocksCache;
}

export async function fetchDynamicStocks(): Promise<import("@/data/brands").BrandProfile[]> {
	// Return cache immediately if already populated — avoids redundant network calls
	if (_dynamicStocksCache.length > 0) return _dynamicStocksCache;

	try {
		const { brands: staticBrands } = await import("@/data/brands");
		const staticTickers = new Set(staticBrands.map((b) => b.ticker.toUpperCase()));

		const res = await fetch(`${API_BASE_URL}/api/stocks`);
		if (!res.ok) return [];
		const { stocks } = await res.json();

		// Filter out class-share duplicates (e.g. GOOG when GOOGL is a static brand)
		const filtered = (stocks ?? []).filter((s: import("@/data/brands").BrandProfile) => {
			const t = s.ticker?.toUpperCase() ?? "";
			return ![...staticTickers].some(
				(st) => st !== t && st.startsWith(t) && st.length === t.length + 1,
			);
		}) as import("@/data/brands").BrandProfile[];

		_dynamicStocksCache = filtered;
		return _dynamicStocksCache;
	} catch {
		return [];
	}
}
