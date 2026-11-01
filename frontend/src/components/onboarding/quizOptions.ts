import { RISK_BUY_MORE, RISK_HOLD, RISK_STEP_AWAY, RISK_SELL_SOME } from "@/lib/tasteModel";
import type { QuizOption } from "./MatrixQuizOption";

/** The risk question's four answers - used by the Risk step and the Taste reveal's risk-style sheet. */
export const RISK_OPTIONS: QuizOption[] = [
	{ index: RISK_BUY_MORE, title: "Buy more after checking why", subtitle: "Comfortable with dips if the story holds", icon: "plus", iconSize: 37.9, circle: 37.9, iconDy: 0 },
	{ index: RISK_HOLD, title: "Hold and watch it closely", subtitle: "I can handle short-term drops", icon: "eye", iconSize: 37.9, circle: 37.9, iconDy: 0 },
	{ index: RISK_STEP_AWAY, title: "Step away for now", subtitle: "Big drops make me uncomfortable", icon: "pause", iconSize: 36, circle: 36, iconDy: 9.95 },
	{ index: RISK_SELL_SOME, title: "Sell some, reduce risk", subtitle: "I’d rather protect part of my money", icon: "shield", iconSize: 20, circle: 36, iconDy: 9.95 },
];
