import type { ReactNode } from "react";
import { AuthCta, AuthSecondary } from "@/components/auth/AuthKit";
import { DISC, cu } from "@/components/discover/discoverTheme";
import { BackCircle, PhonePage, f } from "@/components/phone/phone";

/**
 * Android's quiz frame: a back circle (with "STEP n OF 6" at the right, or a kicker beneath it), a 24u-padded content
 * column, then the CTA block. The column is 800u tall on a tall screen so the block sits where it does on the phone.
 */
export function QuizStepShell({
	stepLabel, kicker, title, titleSize = 24, titleLine = 31, subtitle, subtitleSize = 12, subtitleWidth, gap = 18,
	onBack, continueLabel = "Continue", continueDisabled, onContinue, secondary, caption, noNav, children,
}: {
	stepLabel?: string;
	kicker?: string;
	title?: string;
	titleSize?: number;
	titleLine?: number;
	subtitle?: ReactNode;
	subtitleSize?: number;
	subtitleWidth?: number;
	gap?: number;
	onBack?: () => void;
	onContinue: () => void;
	continueLabel?: string;
	continueDisabled?: boolean;
	secondary?: { label: string; onClick: () => void };
	caption?: string;
	noNav?: boolean;
	children?: ReactNode;
}) {
	return (
		<PhonePage>
			<div style={{ minHeight: `min(${cu(800)}, 100dvh)`, display: "flex", flexDirection: "column" }}>
				{!noNav && (
					<>
						<div className="flex items-center" style={{ padding: `${cu(10)} ${cu(20)} ${cu(4)}` }}>
							{onBack && <BackCircle onClick={onBack} />}
							<div className="flex-1" />
							{stepLabel?.startsWith("STEP ") && stepLabel.includes(" OF ") && (
								<span style={{ font: f(500, 10), letterSpacing: cu(0.9), color: DISC.faint }}>{stepLabel}</span>
							)}
						</div>
						{kicker && <p style={{ padding: `${cu(6)} ${cu(20)} 0`, font: f(500, 10), letterSpacing: cu(1.2), color: DISC.faint }}>{kicker}</p>}
					</>
				)}
				<div className="flex flex-1 flex-col" style={{ gap: cu(gap), padding: `${cu(noNav ? 24 : 14)} ${cu(24)} 0` }}>
					{title && (
						<div style={{ display: "flex", flexDirection: "column", gap: cu(12) }}>
							<h1 style={{ font: f(600, titleSize, titleLine, "heading"), color: "#fff" }}>{title}</h1>
							{subtitle && <p style={{ width: subtitleWidth ? cu(subtitleWidth) : undefined, font: f(400, subtitleSize, subtitleSize === 14 ? 21 : 16), color: "#ACAFB1" }}>{subtitle}</p>}
						</div>
					)}
					{children}
				</div>
				<div style={{ display: "flex", flexDirection: "column", gap: cu(10), padding: `${cu(8)} 0 ${cu(26)}` }}>
					<AuthCta label={continueLabel} onClick={onContinue} disabled={continueDisabled} />
					{secondary && <AuthSecondary label={secondary.label} onClick={secondary.onClick} />}
					{caption && <p className="text-center" style={{ font: f(400, 11), color: DISC.faint }}>{caption}</p>}
				</div>
			</div>
		</PhonePage>
	);
}
