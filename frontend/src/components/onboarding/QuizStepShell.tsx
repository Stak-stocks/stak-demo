import { createContext, useContext, type ReactNode } from "react";
import { AuthCta, AuthSecondary } from "@/components/auth/AuthKit";
import { DISC, cu } from "@/components/discover/discoverTheme";
import { BackCircle, PRESS, PhonePage, f, focusRing } from "@/components/phone/phone";
import { useIsMobile } from "@/hooks/use-mobile";

/** True inside the desktop onboarding frame, where a step lays its content out for a wide window. */
const QuizDesktop = createContext(false);
export const useQuizDesktop = () => useContext(QuizDesktop);

interface ShellProps {
	stepLabel?: string;
	kicker?: string;
	/** Desktop only: a small line above the title ("YOUR STARTING STAK TASTE"). */
	eyebrow?: string;
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
	/** Desktop only: how wide the step's content may run (the button column stays 440). */
	contentWidth?: number;
	children?: ReactNode;
}

/**
 * Android's quiz frame: a back circle (with "STEP n OF 6" at the right, or a kicker beneath it), a 24u-padded content
 * column, then the CTA block. The column is 800u tall on a tall screen so the block sits where it does on the phone.
 * On desktop, the design's full-width frame instead (see QuizDesktopFrame).
 */
export function QuizStepShell(props: ShellProps) {
	const isMobile = useIsMobile();
	if (!isMobile) return <QuizDesktopFrame {...props} />;
	const {
		stepLabel, kicker, title, titleSize = 24, titleLine = 31, subtitle, subtitleSize = 12, subtitleWidth, gap = 18,
		onBack, continueLabel = "Continue", continueDisabled, onContinue, secondary, caption, noNav, children,
	} = props;
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

/** The design's CTA: Android's gradient, full width of the 440 button column. */
export function QuizCta({ label, onClick, disabled }: { label: string; onClick: () => void; disabled?: boolean }) {
	return (
		<button
			type="button"
			onClick={onClick}
			disabled={disabled}
			className={`w-full transition-[filter,opacity] hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-50 ${disabled ? "" : PRESS}`}
			style={{ height: cu(52), borderRadius: cu(6), background: DISC.cta, boxShadow: "0 22px 32px rgba(82,170,199,0.06)", font: f(500, 15), color: "#fff", ...focusRing }}
		>
			{label}
		</button>
	);
}

/**
 * Desktop onboarding, from the design: the STAK mark top-left with the back circle beneath it, the step ("STEP 2 OF 6",
 * or "STEP · ALMOST THERE") top-right, a six-part progress bar across the top, and the step centred - title, content,
 * then the button. 1u tracks the window from the 1440px design frame. A "Back" secondary is dropped (the circle does it).
 */
function QuizDesktopFrame({
	stepLabel, kicker, eyebrow, title, subtitle, onBack, continueLabel = "Continue", continueDisabled, onContinue, secondary, caption, noNav,
	contentWidth = 640, children,
}: ShellProps) {
	const step = stepLabel?.match(/^STEP (\d+) OF (\d+)$/);
	const label = stepLabel ?? kicker;
	return (
		<QuizDesktop.Provider value>
			<div className="relative flex min-h-dvh flex-col" style={{ background: DISC.pageBg, ["--u" as string]: "clamp(1px, calc(100vw / 1440), 1.25px)" }}>
				{!noNav && (
					<>
						<div className="absolute flex items-center" style={{ left: cu(60), top: cu(44), gap: cu(6) }} aria-label="STAK" role="img">
							<img src="/images/landing-v2/nav-logo-icon.svg" alt="" draggable={false} style={{ width: cu(27), height: cu(27) }} />
							<img src="/images/landing-v2/nav-logo-word.svg" alt="" draggable={false} style={{ width: cu(78), height: cu(15) }} />
						</div>
						{label && <p className="absolute" style={{ right: cu(60), top: cu(50), font: f(500, 12), letterSpacing: cu(1.5), color: DISC.muted }}>{label}</p>}
						{step && (
							<div className="absolute left-1/2 flex -translate-x-1/2" style={{ top: cu(100), gap: cu(6) }} role="img" aria-label={`Step ${step[1]} of ${step[2]}`}>
								{Array.from({ length: Number(step[2]) }, (_, i) => (
									<span key={i} style={{ width: cu(56), height: cu(3), borderRadius: cu(2), background: i < Number(step[1]) ? DISC.teal : DISC.divider }} />
								))}
							</div>
						)}
					</>
				)}
				{onBack && <div className="absolute" style={{ left: cu(60), top: cu(96), zIndex: 5 }}><BackCircle onClick={onBack} /></div>}

				<div className="m-auto flex w-full flex-col items-center" style={{ maxWidth: `calc(${cu(contentWidth)} + ${cu(48)})`, padding: `${cu(noNav ? 60 : 150)} ${cu(24)} ${cu(60)}` }}>
					{title && (
						<div className="flex flex-col items-center text-center" style={{ gap: cu(12) }}>
							{eyebrow && <p style={{ font: f(500, 12), letterSpacing: cu(1.5), color: DISC.muted }}>{eyebrow}</p>}
							<h1 style={{ font: f(600, 32, 40, "heading"), color: "#fff" }}>{title}</h1>
							{subtitle && <p style={{ font: f(400, 14, 20), color: DISC.muted }}>{subtitle}</p>}
						</div>
					)}
					<div className="w-full" style={{ marginTop: title ? cu(52) : 0 }}>{children}</div>
					<div className="flex w-full flex-col items-center" style={{ marginTop: cu(48), maxWidth: cu(440), gap: cu(14) }}>
						<QuizCta label={continueLabel} onClick={onContinue} disabled={continueDisabled} />
						{secondary && secondary.label !== "Back" && (
							<button type="button" onClick={secondary.onClick} className={`rounded-md hover:text-white ${PRESS}`} style={{ font: f(500, 14), color: DISC.muted, ...focusRing }}>{secondary.label}</button>
						)}
						{caption && <p style={{ font: f(400, 12), color: DISC.muted }}>{caption}</p>}
					</div>
				</div>
			</div>
		</QuizDesktop.Provider>
	);
}
