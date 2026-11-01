// "What to watch next" on the Daily Brief page: the brief's own items, else mood-based defaults, each with a glyph
// picked from what it says. Shared by the phone and desktop layouts.
import {
	Activity, Cpu, DollarSign, Eye, Fuel, GraduationCap, Landmark, Layers, Percent, Shield, Sprout, TrendingUp, type LucideIcon,
} from "lucide-react";

/** "What to watch next" defaults when the brief carries none, by mood (Android's DailyBriefDetailScreen). */
const DEFAULT_WATCH: Record<string, Array<{ label: string; body: string }>> = {
	bullish: [
		{ label: "Index breakouts", body: "Watch SPY and QQQ for sustained moves above resistance." },
		{ label: "Growth names", body: "High-beta growth stocks tend to lead in risk-on conditions." },
		{ label: "Fed speakers", body: "Any hawkish pivot could cool the rally quickly." },
	],
	bearish: [
		{ label: "Defensive plays", body: "Utilities and consumer staples may outperform." },
		{ label: "Support levels", body: "Key technical supports on SPY and QQQ to monitor." },
		{ label: "Dollar strength", body: "Risk-off flows often boost USD and Treasury bonds." },
	],
	volatile: [
		{ label: "VIX moves", body: "Elevated VIX signals uncertainty — watch for spikes above 20." },
		{ label: "Earnings reactions", body: "Volatile tape amplifies post-earnings moves." },
		{ label: "Sector rotation", body: "Money rotating between sectors — follow the volume." },
	],
	cautious: [
		{ label: "Economic data", body: "Upcoming macro data could set market direction." },
		{ label: "Bank commentary", body: "Listen for guidance shifts from major financial institutions." },
		{ label: "Headline risk", body: "Geopolitical or policy news can move markets fast." },
	],
	other: [
		{ label: "Market breadth", body: "Watch how many stocks are advancing vs declining." },
		{ label: "Sector leaders", body: "Identify which sectors are setting the pace today." },
		{ label: "Upcoming catalysts", body: "Earnings reports and macro events on the calendar." },
	],
};

export function defaultWatch(mood: string) {
	const m = mood.trim().toLowerCase();
	if (m === "bullish" || m === "risk-on") return DEFAULT_WATCH.bullish;
	if (m === "bearish" || m === "risk-off") return DEFAULT_WATCH.bearish;
	return DEFAULT_WATCH[m] ?? DEFAULT_WATCH.other;
}

/** The glyph for a watch item comes from what it says, not from the emoji the API sends. First match wins. */
const WATCH_ICONS: Array<[RegExp, LucideIcon]> = [
	[/fed|central bank|powell|hawkish|dovish|speaker|rate decision/, Landmark],
	[/oil|crude|opec|barrel/, Fuel],
	[/bond|yield|treasury|rate/, Percent],
	[/vix|volatil/, Activity],
	[/dollar|currency|usd/, DollarSign],
	[/tech|chip|semiconductor|software/, Cpu],
	[/material|sector|rotation|industrial/, Layers],
	[/sentiment|market|index|breakout|momentum|support/, TrendingUp],
	[/defensive|safety|utilit|staple|shield/, Shield],
	[/growth|grow|high-beta/, Sprout],
	[/earnings|report|reaction/, GraduationCap],
];
export function watchIcon(label: string, body: string): LucideIcon {
	const text = `${label} ${body}`.toLowerCase();
	return WATCH_ICONS.find(([re]) => re.test(text))?.[1] ?? Eye;
}

