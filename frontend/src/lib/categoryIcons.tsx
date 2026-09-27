// One lucide-react icon per My STAK collection display name (see
// @stak/shared's stakCategories.ts for the id -> display name taxonomy this
// keys off). Android ships custom vector art per category (StakCategories.kt's
// categoryIcon()); the web has no equivalent art, so this picks a fresh but
// deliberate icon per name instead of trying to recreate it pixel-for-pixel.
//
// Standing rule (WEB_HANDOFF.md §4.6): no category may silently fall through
// to a generic default icon — CATEGORY_ICON must have an explicit entry for
// every CATEGORY_NAMES value. assertCategoryIconsComplete() below enforces
// that at dev/test time.
import {
	Code2, Cpu, Database, ShoppingBag, ShoppingCart, Store, UtensilsCrossed,
	Landmark, ShieldCheck, Fuel, Wallet, Package, Factory, LineChart, Briefcase,
	CreditCard, Coins, Handshake, BarChart3, Plug, Pickaxe, BatteryCharging, Car,
	Leaf, Pill, Stethoscope, HeartPulse, FlaskConical, Smartphone, Shield, Rocket,
	Users, Plane, ShieldAlert, Building2, Truck, PlaneTakeoff, TrendingUp, Sparkles,
	Signal, Settings2, Megaphone, Flame, Shirt, Wine, Apple, Clapperboard, Dice5,
	Gamepad2, Home,
	type LucideIcon,
} from "lucide-react";
import { CATEGORY_NAMES } from "@stak/shared";

export const CATEGORY_ICON: Record<string, LucideIcon> = {
	Software: Code2,
	Chips: Cpu,
	Data: Database,
	AI: Cpu,
	"Big Tech": Sparkles,
	"General Tech": Settings2,
	"Consumer Tech": TrendingUp,
	"Ad Tech": Megaphone,
	"Social Media": Users,
	Gaming: Gamepad2,
	Cybersecurity: Shield,

	Banks: Landmark,
	Fintech: Wallet,
	Markets: LineChart,
	"Asset Managers": Briefcase,
	"Financial Data": Database,
	Payments: CreditCard,
	Insurance: ShieldCheck,
	Crypto: Coins,
	"Private Equity": Handshake,
	"Index Funds": BarChart3,
	Finance: Landmark,

	Energy: Fuel,
	Utilities: Plug,
	Mining: Pickaxe,
	EVs: BatteryCharging,
	Autos: Car,
	"Clean Energy": Leaf,

	Pharma: Pill,
	MedTech: Stethoscope,
	"Health Insurers": HeartPulse,
	Biotech: FlaskConical,
	"Digital Health": Smartphone,

	Space: Rocket,
	Defense: ShieldAlert,
	"Real Estate": Building2,
	Logistics: Truck,
	Airlines: PlaneTakeoff,
	Travel: Plane,
	Telecom: Signal,
	Industrials: Factory,
	"Meme Stocks": Flame,

	Retail: Store,
	"E-commerce": ShoppingCart,
	"Home Retail": Home,
	Staples: Package,
	Fashion: Shirt,
	Drinks: Wine,
	Restaurants: UtensilsCrossed,
	Food: Apple,
	Streaming: Clapperboard,
	Casinos: Dice5,
	Consumer: ShoppingBag,
};

/** The icon for a collection's display name, or the family's fallback icon if
 *  somehow uncovered — used only by the completeness check below, never as a
 *  silent runtime fallback (every real name is asserted covered at test time). */
export function categoryIcon(name: string): LucideIcon {
	return CATEGORY_ICON[name] ?? Sparkles;
}

/** Throws listing every CATEGORY_NAMES value missing from CATEGORY_ICON — call
 *  from a unit test so a newly added category can never silently fall through
 *  to a generic icon (WEB_HANDOFF.md §4.6's standing rule). */
export function assertCategoryIconsComplete(): void {
	const missing = [...new Set(Object.values(CATEGORY_NAMES))].filter((name) => !(name in CATEGORY_ICON));
	if (missing.length > 0) {
		throw new Error(`categoryIcons.tsx is missing an explicit icon for: ${missing.join(", ")}`);
	}
}
