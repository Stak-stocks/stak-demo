import { supabase } from "./supabase";
import { getTodayKey } from "./utils";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:3001";

async function getAuthToken(): Promise<string | null> {
	const { data } = await supabase.auth.getSession();
	return data.session?.access_token ?? null;
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
		let message = `API error: ${response.status} ${response.statusText}`;
		try {
			const body = await response.json() as { error?: string };
			if (body.error) message = body.error;
		} catch { /* ignore parse failure */ }
		throw new Error(message);
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
// Lightweight summary of every brand -- excludes culturalContext,
// personalityDescription, and each financial metric's label/explanation/
// culturalTranslation, so this stays small as the catalog grows (~225KB for
// 333 entries vs ~850KB for the fully-bundled equivalent). Use getBrandDetail
// for one brand's full profile when actually viewing its detail sheet.
export function getBrandsList() {
	return apiRequest<{ brands: import("@stak/shared").BrandSummary[] }>("/api/brands");
}

export function getBrandDetail(id: string) {
	return apiRequest<import("@stak/shared").BrandProfile>(`/api/brands/${encodeURIComponent(id)}`);
}

export function getPopularBrands() {
	return apiRequest<{ brandIds: string[] }>("/api/brands/popular");
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
export interface RecordSwipeResponse {
	success: boolean;
	limitReached?: boolean;
	dailySwipeCount: number;
	dailySwipeLimit: number;
	streakUpdate?: unknown;
}

export function recordSwipe(
	brandId: string,
	direction: "left" | "right",
	meta?: { ticker?: string; categories?: string[]; stakSize?: number; timeOnCardMs?: number; swipeVelocity?: number },
) {
	return apiRequest<RecordSwipeResponse>("/api/swipe", {
		method: "POST",
		body: JSON.stringify({ brandId, direction, todayKey: getTodayKey(), ...meta }),
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

/** Track any named event (shows up in the analytics dashboard).
 *  Sends todayKey so the backend can credit streak-affecting event types
 *  (brand_tap, playground_activity) to the user's own local day, same as
 *  recordSwipe -- a streak is a personal daily habit, not a market concept. */
export function trackEvent(
	type: string,
	params?: Record<string, unknown>,
) {
	return apiRequest("/api/swipe/event", {
		method: "POST",
		body: JSON.stringify({ type, params, todayKey: getTodayKey() }),
	});
}

// News
export interface EarningsSignal {
	status: "upcoming" | "beat" | "miss" | "none";
	date: string | null;
}

export function getCompanyNews(symbol: string, name?: string) {
	const query = name ? `?name=${encodeURIComponent(name)}` : "";
	return apiRequest<{
		articles: import("@stak/shared").NewsArticle[];
		earningsSignal: EarningsSignal;
	}>(`/api/news/company/${symbol}${query}`);
}

export function getMarketNews() {
	return apiRequest<{ articles: import("@stak/shared").NewsArticle[] }>("/api/news/market");
}

export function searchNews(query: string) {
	return apiRequest<{ articles: import("@stak/shared").NewsArticle[] }>(
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

// Sandbox portfolio
export function sandboxInit() {
	return apiRequest<{ ok: boolean }>("/api/sandbox/init", { method: "POST" });
}

export interface SandboxBuyResult {
	price: number;
	shares: number;
	costBasis: number;
	cost: number;
	remainingCash: number;
}

export function sandboxBuy(ticker: string, shares: number, thesis?: string) {
	return apiRequest<SandboxBuyResult>("/api/sandbox/buy", {
		method: "POST",
		body: JSON.stringify({ ticker, shares, thesis }),
	});
}

export interface SandboxSellResult {
	price: number;
	sharesToSell: number;
	sellValue: number;
	remaining: number;
}

export function sandboxSell(ticker: string, shares?: number) {
	return apiRequest<SandboxSellResult>("/api/sandbox/sell", {
		method: "POST",
		body: JSON.stringify({ ticker, shares }),
	});
}

export function sandboxReset() {
	return apiRequest<{ ok: boolean; cash: number; tier: number }>("/api/sandbox/reset", { method: "POST" });
}

export function sandboxMilestone(value: number) {
	return apiRequest<{ ok: boolean }>("/api/sandbox/milestone", {
		method: "POST",
		body: JSON.stringify({ value }),
	});
}

export function sandboxTierUpgrade() {
	return apiRequest<{ ok: boolean; increase?: number; newTier?: number }>("/api/sandbox/tier-upgrade", { method: "POST" });
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

export interface SwipeLimitIncrementResponse {
	accepted: boolean;
	count: number;
	limit: number;
}

/** Server-authoritative increment for the search-add / global add-to-stak paths,
 *  which don't go through recordSwipe(). Never trust a client-side count. */
export function incrementSwipeCountServer() {
	return apiRequest<SwipeLimitIncrementResponse>("/api/me/swipes/increment", {
		method: "POST",
		body: JSON.stringify({ todayKey: getTodayKey() }),
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
	marketState?: "PRE" | "REGULAR" | "POST" | "POSTPOST" | "PREPRE" | "CLOSED";
	extendedPrice?: number | null;
	extendedChange?: number | null;
	extendedChangePercent?: number | null;
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

export interface AnalystData {
	priceTarget: { low: number | null; avg: number | null; high: number | null } | null;
	recommendation: {
		strongBuy: number; buy: number; hold: number; sell: number; strongSell: number;
		period: string | null;
	} | null;
}

export function getAnalystData(symbol: string, name?: string) {
	const qs = name ? `?name=${encodeURIComponent(name)}` : "";
	return apiRequest<AnalystData>(`/api/stock/${encodeURIComponent(symbol)}/analyst${qs}`);
}

export interface AnalystAction {
	firm: string;
	action: string;
	priceTarget: number | null;
}

export function getAnalystActions(symbol: string, name?: string) {
	const qs = name ? `?name=${encodeURIComponent(name)}` : "";
	return apiRequest<AnalystAction[]>(`/api/stock/${encodeURIComponent(symbol)}/analyst-actions${qs}`);
}

export interface PeerMetrics {
	ticker: string;
	peerTickers: string[];
	peerCount: number;
	pe: number | null;
	revenueGrowth: number | null;
	profitMargin: number | null;
	beta: number | null;
}

export function getPeerMetrics(symbol: string) {
	return apiRequest<PeerMetrics>(`/api/stock/peer-metrics/${encodeURIComponent(symbol)}`);
}

export function getEarnings(symbol: string, name?: string) {
	const qs = name ? `?name=${encodeURIComponent(name)}` : "";
	return apiRequest<{
		status: "upcoming" | "beat" | "miss" | "none";
		date: string | null;
		hour?: string;
	}>(`/api/stock/${encodeURIComponent(symbol)}/earnings${qs}`);
}

export interface EarningsQuick {
	period: string;
	quarter: number;
	year: number;
	epsActual: number | null;
	epsEstimate: number | null;
	beat: boolean | null;
	surprisePercent: number | null;
}

export function getEarningsQuick(symbol: string) {
	return apiRequest<EarningsQuick | null>(`/api/stock/${encodeURIComponent(symbol)}/earnings-quick`);
}

export interface DailyMoveBullet {
	text: string;
	tone: "bullish" | "bearish" | "neutral";
}
export interface DailyMoveData {
	explanation: string;
	direction: "up" | "down" | "flat";
	bullets?: DailyMoveBullet[];
}

export function getDailyMove(symbol: string, changePercent?: number, name?: string, sentences?: number, marketClosed?: boolean, closeRef?: string) {
	const params = new URLSearchParams();
	if (changePercent !== undefined) params.set("pct", changePercent.toFixed(4));
	if (name) params.set("name", name);
	if (sentences && sentences > 1) params.set("sentences", String(sentences));
	if (marketClosed) params.set("marketClosed", "1");
	if (closeRef) params.set("closeRef", closeRef);
	const qs = params.toString() ? `?${params.toString()}` : "";
	return apiRequest<DailyMoveData>(`/api/stock/${encodeURIComponent(symbol)}/daily-move${qs}`);
}

export function getKeyRisk(symbol: string, name?: string, beta?: string, pe?: string) {
	const params = new URLSearchParams();
	if (name) params.set("name", name);
	if (beta) params.set("beta", beta);
	if (pe) params.set("pe", pe);
	const qs = params.toString() ? `?${params.toString()}` : "";
	return apiRequest<{ risk: string | null }>(`/api/stock/${encodeURIComponent(symbol)}/key-risk${qs}`);
}

export interface StockChartPoint { ts: string; close: number; session?: "pre" | "regular" | "post"; }
export type ChartRange = "1d" | "1w" | "1m" | "3m" | "ytd" | "1y";

export function getStockChart(symbol: string, range: ChartRange = "1m") {
	return apiRequest<{ prices: StockChartPoint[] }>(
		`/api/stock/${encodeURIComponent(symbol)}/chart?range=${range}`,
	);
}

export interface DailyBriefDeck {
	id: string;
	title: string;
	subtitle: string;
	icon: string;
	color: "green" | "purple" | "blue";
	bars?: boolean;
}

export interface FeaturedLesson {
	eventType: string;
	angle?: string;
	title: string;
	subtitle: string;
	emoji: string;
	cards: Array<{ heading: string; body: string }>;
	quiz: {
		question: string;
		options: Array<{ id: string; text: string }>;
		correctId: string;
		explanation: string;
	};
}

export interface DailyBriefResponse {
	mood: "Bullish" | "Bearish" | "Cautious" | "Volatile" | "Calm" | "Mixed";
	session: "open" | "midday" | "close";
	dayLabel: string;
	marketClosed: boolean;
	nextTradingDayLabel: string;
	moodExplanation: string;
	plainEnglish: string;
	personalizedImpact: string;
	decks: DailyBriefDeck[];
	featuredLesson?: FeaturedLesson;
	marketSnapshot: {
		spyChange: number | null;
		qqqChange: number | null;
		diaChange: number | null;
	};
	generatedAt: string;
}

export function getDailyBrief() {
	return apiRequest<DailyBriefResponse>("/api/daily-brief");
}

/** Live market-open status backed by Finnhub's real exchange status (catches
 *  unscheduled closures and any NYSE holiday-schedule change) — not just the
 *  client-side algorithmic holiday calendar. Public, no auth required. */
export function getMarketStatusLive() {
	return apiRequest<{ isOpen: boolean; holiday: string | null }>("/api/daily-brief/market-status");
}

export function getFeaturedLesson() {
	return apiRequest<{ lesson: FeaturedLesson | null; isMarketDay?: boolean; isTradingDay?: boolean }>("/api/daily-brief/featured-lesson");
}

export interface GeneratedLesson {
	topic: string;
	angle: string;
	title: string;
	subtitle: string;
	emoji: string;
	cards: Array<{ heading: string; body: string }>;
	quiz: {
		question: string;
		options: Array<{ id: string; text: string }>;
		correctId: string;
		explanation: string;
	};
}

export function getGeneratedLesson() {
	return apiRequest<{ lesson: GeneratedLesson | null }>("/api/daily-brief/generated-lesson");
}

export interface RecommendationDebugStock {
	ticker: string;
	primaryCategory: string;
	displayTags: string[];
	finalScore: number;
	scoreBreakdown: {
		tasteMatchScore: number;
		freshnessBoost: number;
		dailyBriefThemeBoost: number;
		diversityAdjustment: number;
	};
	matchedUserTags: string[];
}

export interface FreshnessSignals {
	majorNewsLast48h: string[];
	unusualMovers: string[];
	analystUpdatesLast7d: string[];
}

export function getRecommendationFreshness() {
	return apiRequest<FreshnessSignals>("/api/recommendations/freshness");
}

export function getRecommendationDebug(limit = 50) {
	return apiRequest<{
		uid: string;
		hasTagScores: boolean;
		tagScoreCount: number;
		upcomingEarningsCount: number;
		upcomingEarningsTickers: string[];
		totalStocks: number;
		returnedCount: number;
		stocks: RecommendationDebugStock[];
	}>(`/api/recommendations/debug?limit=${limit}`);
}

// Stak AI
export interface StakAiConversation {
	id: string;
	title: string;
	created_at: string;
	updated_at: string;
}

export interface StakAiMessage {
	id: number;
	role: "user" | "assistant";
	content: string;
	created_at: string;
}

export function sendStakAiMessage(message: string, conversationId?: string) {
	return apiRequest<{ response: string; conversationId: string }>("/api/stak-ai/chat", {
		method: "POST",
		body: JSON.stringify({ message, conversationId }),
	});
}

export function getStakAiConversations() {
	return apiRequest<{ conversations: StakAiConversation[] }>("/api/stak-ai/conversations");
}

export function getStakAiMessages(conversationId: string) {
	return apiRequest<{ messages: StakAiMessage[] }>(`/api/stak-ai/conversations/${conversationId}/messages`);
}

export async function generatePlaygroundQuestions(
	dayKey: string,
	tier: number,
	type: "battle" | "earnings" | "risk" | "mood" | "lesson" | "drill_sentiment" | "drill_nextstep",
	count: number,
): Promise<unknown[]> {
	return apiRequest<{ questions: unknown[] }>("/api/playground/generate", {
		method: "POST",
		body: JSON.stringify({ dayKey, tier, type, count }),
	}).then(r => r.questions ?? []);
}

// Playground XP — server-authoritative writes replacing direct Supabase RPC calls
export function completeActivity(kind: "lesson" | "earnings" | "battle" | "risk" | "mood", itemId: string, xp?: number) {
	return apiRequest<{ newlyCompleted: boolean; xp?: number }>("/api/playground/complete-activity", {
		method: "POST",
		body: JSON.stringify({ kind, itemId, xp }),
	});
}

export function completeDailyActivityApi(dayKey: string, activityId: string, xp?: number, activityType?: string) {
	return apiRequest<{ ok: boolean }>("/api/playground/complete-daily", {
		method: "POST",
		body: JSON.stringify({ dayKey, activityId, xp, activityType }),
	});
}

export function addSkillXp(skill: string, xp: number) {
	return apiRequest<{ ok: boolean; xp: number }>("/api/playground/skill-xp", {
		method: "POST",
		body: JSON.stringify({ skill, xp }),
	});
}

export function getDrillSeen() {
	return apiRequest<{ sentiment: string[]; nextstep: string[] }>("/api/playground/drill-seen");
}

export function saveDrillSeen(type: "sentiment" | "nextstep", hashes: string[]) {
	return apiRequest<{ ok: boolean }>("/api/playground/drill-seen", {
		method: "POST",
		body: JSON.stringify({ type, hashes }),
	});
}

// Batch stock quotes for the watchlist
export function getBatchQuotes(tickers: string[]) {
	return apiRequest<{ quotes: Record<string, { price: number; change: number; changePercent: number }> }>(
		`/api/stock/batch-quotes?tickers=${encodeURIComponent(tickers.join(","))}`,
	);
}

// Search history — server manages dedup/cap (replaces 4 Supabase round-trips per add)
export function addSearchHistoryEntry(query: string) {
	return apiRequest<{ ok: boolean }>("/api/me/search-history", {
		method: "POST",
		body: JSON.stringify({ query }),
	});
}

export function removeSearchHistoryEntry(query: string) {
	return apiRequest<{ ok: boolean }>(`/api/me/search-history/${encodeURIComponent(query)}`, {
		method: "DELETE",
	});
}

export function clearSearchHistoryApi() {
	return apiRequest<{ ok: boolean }>("/api/me/search-history", { method: "DELETE" });
}

// Stak brand price backfill
export function patchStakBrandPrice(brandId: string, price: number) {
	return apiRequest<{ ok: boolean }>(`/api/me/stak/${encodeURIComponent(brandId)}/price`, {
		method: "PATCH",
		body: JSON.stringify({ price }),
	});
}

// Sorted recommendations (server-scored, personalized)
export function getSortedRecommendations(limit?: number) {
	const q = limit ? `?limit=${limit}` : "";
	return apiRequest<{ brandIds: string[] }>(`/api/recommendations${q}`);
}
