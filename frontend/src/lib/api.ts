import { supabase } from "./supabase";
import { getTodayKey } from "./utils";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:3001";

async function getAuthToken(): Promise<string | null> {
	const { data } = await supabase.auth.getSession();
	return data.session?.access_token ?? null;
}

/** A failed API call. `status` lets callers tell the server refusing a request (4xx, with its own reason) from an outage. */
export class ApiError extends Error {
	constructor(message: string, readonly status: number) {
		super(message);
		this.name = "ApiError";
	}
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
		throw new ApiError(message, response.status);
	}

	return response.json();
}

/** Joins the early-access list (public, no account needed). Joining twice answers the same as joining once. */
export function joinWaitlist(email: string) {
	return apiRequest<{ ok: boolean; already: boolean; emailed?: boolean }>("/api/waitlist", { method: "POST", body: JSON.stringify({ email, source: "landing" }) });
}

// User profile
export function getProfile() {
	return apiRequest<{ uid: string; email: string; displayName: string; phone?: string; preferences: Record<string, unknown> & { interests?: string[] }; onboardingCompleted?: boolean; createdAt?: string; plan?: string; taste?: { goal: number; risk: number; riskStyle: string; picks: string[] } | null }>("/api/me");
}

/** Deletes the account and every saved row (and, best-effort, the Supabase auth record). */
export function deleteMe() {
	return apiRequest<{ ok: boolean }>("/api/me", { method: "DELETE" });
}

// Browser push (Web Push): the VAPID public key to subscribe with, and this browser's registration
export function getWebPushKey() {
	return apiRequest<{ publicKey: string }>("/api/me/web-push-key");
}

export function putPushDevice(body: {
	token: string;
	platform: "web";
	webKeys: { p256dh: string; auth: string };
	timezone: string;
	priceAlerts: boolean;
	dailyDeck: boolean;
}) {
	return apiRequest<{ ok: boolean }>("/api/me/push-device", { method: "PUT", body: JSON.stringify(body) });
}

export function deletePushDevice(token: string) {
	return apiRequest<{ ok: boolean }>("/api/me/push-device", { method: "DELETE", body: JSON.stringify({ token }) });
}

// Cross-device inbox/saved-news state (the endpoint is named for Android, its first client; the
// web reads/writes the same ids so read state follows the account). Omitted fields on PUT are left alone.
export interface DeviceState {
	portfolio: unknown;
	notifRead: string[];
	newsSaved: string[];
}

export function getDeviceState() {
	return apiRequest<DeviceState>("/api/me/android-state");
}

export function putDeviceState(patch: { notifRead?: string[]; newsSaved?: string[] }) {
	return apiRequest<{ ok: boolean }>("/api/me/android-state", {
		method: "PUT",
		body: JSON.stringify(patch),
	});
}

export interface AndroidTaste {
	goal: number;
	risk: number;
	riskStyle: string;
	picks: string[];
}

export function updateProfile(data: { displayName?: string; phone?: string; preferences?: Record<string, unknown> & { interests?: string[] }; onboardingCompleted?: boolean; taste?: AndroidTaste }) {
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

/** Gemini-written two-sentence tip for a Discover card ("" when generation isn't available). */
export function getBrandTip(id: string) {
	return apiRequest<{ tip: string }>(`/api/brands/${encodeURIComponent(id)}/tip`);
}

export interface QuickLook {
	in10Seconds: string;
	whyNow: string;
	setup: string;
	catch: string;
	whatToWatch: string;
	keyThemes: string[];
}

/** The Quick Look sheet's 30-second overview; `quickLook` is null when generation isn't available. */
export function getQuickLook(id: string) {
	return apiRequest<{ quickLook: QuickLook | null }>(`/api/brands/${encodeURIComponent(id)}/quick-look`);
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

// Investing Taste — GET /api/me/taste
export interface TasteThemeDto {
	category: string;
	score: number;
	share: number;
	saves: number;
	learnMores: number;
	opens: number;
	passes: number;
	savedNames: string[];
	lastSavedAt: string | null;
}

export interface TasteApiResponse {
	themes: TasteThemeDto[];
	otherShare: number;
	/** The themes behind otherShare, one by one (newer backends only). */
	otherThemes?: TasteThemeDto[];
	totalSaves: number;
	signals: number;
	learning: boolean;
}

export function getTaste() {
	return apiRequest<TasteApiResponse>("/api/me/taste");
}

// What Changed — GET /api/me/updates, POST /api/me/updates/:id/read
export interface UpdateSourceDto {
	source: string;
	url: string;
	headline: string;
	datetime: number;
}

export interface StockUpdateDto {
	id: number;
	ticker: string;
	company: string;
	kind: string;
	title: string;
	body: string;
	watch: string | null;
	sources: UpdateSourceDto[];
	occurredAt: string;
	read: boolean;
}

export interface UpdatesApiResponse {
	updates: StockUpdateDto[];
	unread: number;
}

export function getUpdates() {
	return apiRequest<UpdatesApiResponse>("/api/me/updates");
}

export function markUpdateRead(id: number) {
	return apiRequest<{ ok: true }>(`/api/me/updates/${id}/read`, { method: "POST" });
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
	options?: { keepalive?: boolean },
) {
	return apiRequest<RecordSwipeResponse>("/api/swipe", {
		method: "POST",
		keepalive: options?.keepalive,
		body: JSON.stringify({ brandId, direction, todayKey: getTodayKey(), ...meta }),
	});
}

/** Engagement events. Investing Taste counts `learn_more` (Quick Looks read) and `stock_detail_open` (company pages
 *  opened) per ticker, the same events Android sends. */
export function recordEngagement(
	type: "learn_more" | "removed_from_stak" | "stock_detail_open",
	brandId: string | undefined,
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

/** Android's wire format: dollars to spend; the server prices the fill. */
export function sandboxBuyAmount(ticker: string, amount: number) {
	return apiRequest<SandboxBuyResult>("/api/sandbox/buy", {
		method: "POST",
		body: JSON.stringify({ ticker, amount }),
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

/** Android's wire format: the fraction of the position to sell (1 = all). */
export function sandboxSellPortion(ticker: string, portion: number) {
	return apiRequest<SandboxSellResult>("/api/sandbox/sell", {
		method: "POST",
		body: JSON.stringify({ ticker, portion }),
	});
}

export function sandboxReset() {
	return apiRequest<{ ok: boolean; cash: number; tier: number | null; name: string | null; strategy: string | null }>(
		"/api/sandbox/reset", { method: "POST" },
	);
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

// Free-choice setup (Android's model, now on web too): user picks a starting balance,
// name and strategy, opting out of XP-tier top-ups.
export function sandboxSetup(startingBalance: number, name: string, strategy: string) {
	return apiRequest<{ ok: boolean; cash: number; name: string; strategy: string }>("/api/sandbox/setup", {
		method: "POST",
		body: JSON.stringify({ startingBalance, name, strategy }),
	});
}

export interface SandboxOrderResult {
	id: number;
	ticker: string;
	amount: number;
	limitPrice: number;
	status: "open";
	createdAt: string;
	remainingCash: number;
}

export function sandboxPlaceOrder(ticker: string, amount: number, limitPrice: number) {
	return apiRequest<SandboxOrderResult>("/api/sandbox/orders", {
		method: "POST",
		body: JSON.stringify({ ticker, amount, limitPrice }),
	});
}

export function sandboxCancelOrder(id: number) {
	return apiRequest<{ ok: boolean }>(`/api/sandbox/orders/${id}/cancel`, { method: "POST" });
}

export interface SandboxTrade {
	id: number;
	ticker: string;
	side: "buy" | "sell";
	shares: number;
	price: number;
	amount: number;
	source: "market" | "limit";
	executedAt: string;
}

export function getSandboxTrades(limit = 50) {
	return apiRequest<{ trades: SandboxTrade[] }>(`/api/sandbox/trades?limit=${limit}`);
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

/** The stock page's Risk snapshot and What to watch next (503 when it can't be built). */
export interface RiskWatch {
	risks: Array<{ label: string; level: string | null; note: string }>;
	watch: Array<{ title: string; note: string }>;
	rated?: boolean;
}

export function getRiskWatch(symbol: string) {
	return apiRequest<RiskWatch>(`/api/stock/${encodeURIComponent(symbol)}/risk-watch`);
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
	/** The Daily Brief page's "What actually happened" items (three at most). */
	whatHappened?: Array<{ title: string; body: string }>;
	/** "Why can the Dow rise while the Nasdaq falls?" - shown in the Ask STAK AI card. */
	contextQuestion?: string;
	/** "What to watch next" rows; `icon` is an emoji the app ignores in favour of its own glyphs. */
	watchItems?: Array<{ icon: string; label: string; body: string }>;
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
	return apiRequest<{ ok: boolean; xp: number; xpToday: number }>("/api/playground/skill-xp", {
		method: "POST",
		body: JSON.stringify({ skill, xp }),
	});
}

export function getDrillSeen() {
	return apiRequest<{ sentiment: string[]; nextstep: string[]; xpToday: number }>("/api/playground/drill-seen");
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

export interface TrendingStock {
	ticker: string;
	name: string;
	price: number;
	change: number;
	changePercent: number;
}

/** Home's Trending strip — top movers, public, 3-min server cache. */
export function getTrending() {
	return apiRequest<{ trending: TrendingStock[] }>("/api/stock/trending");
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
