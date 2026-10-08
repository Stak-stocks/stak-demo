import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { QuizStepShell } from "@/components/onboarding/QuizStepShell";
import { PermissionCard, StakToggle } from "@/components/profile/ProfileKit";
import { useIsMobile } from "@/hooks/use-mobile";
import { Bell } from "lucide-react";
import { enableWebPush } from "@/lib/webPush";
import { DEFAULT_NOTIFICATION_PREFS } from "@/lib/notificationPrefs";
import { DISC, cu } from "@/components/discover/discoverTheme";
import { f, sheetCard } from "@/components/phone/phone";

export const Route = createFileRoute("/onboarding_/permissions")({
	component: PermissionsPage,
});

/**
 * "STEP - ALMOST THERE" - Notifications only (Android's second toggle, the biometric lock, has no browser
 * equivalent). Neither choice ever blocks Continue.
 */
function PermissionsPage() {
	const navigate = useNavigate();
	const [notifications, setNotifications] = useState(true);
	const desk = !useIsMobile();
	async function handleContinue() {
		if (notifications) {
			// Asks the browser's permission and subscribes it - best-effort: a denied prompt, an unsupported
			// browser or a server without keys must never block onboarding.
			await enableWebPush(DEFAULT_NOTIFICATION_PREFS).catch(() => "failed");
		}
		navigate({ to: "/onboarding/profile-setup" });
	}

	return (
		<QuizStepShell
			onBack={() => navigate({ to: "/onboarding/taste-reveal" })}
			kicker="STEP · ALMOST THERE"
			title="Stay in the loop"
			titleSize={26}
			titleLine={33}
			subtitle="One quick permission so STAK can alert you."
			continueLabel="Allow and continue"
			secondary={{ label: "Not now", onClick: () => navigate({ to: "/onboarding/profile-setup" }) }}
			onContinue={handleContinue}
			contentWidth={440}
			caption={desk ? "You can change this anytime in Settings." : undefined}
		>
			{desk ? (
				<div className="flex items-center" style={{ gap: cu(20), ...sheetCard(16), padding: `${cu(28)} ${cu(28)}` }}>
					<span className="grid shrink-0 place-items-center rounded-full" style={{ width: cu(56), height: cu(56), background: DISC.avatar }} aria-hidden="true">
						<Bell style={{ width: cu(20), height: cu(20), color: DISC.muted }} />
					</span>
					<span className="min-w-0 flex-1" style={{ display: "flex", flexDirection: "column", gap: cu(6) }}>
						<span style={{ font: f(500, 16, 22), color: "#fff" }}>Notifications</span>
						<span style={{ font: f(400, 13, 18), color: DISC.muted }}>Price moves on your picks and your daily deck.</span>
					</span>
					<StakToggle checked={notifications} onChange={setNotifications} label="Notifications" />
				</div>
			) : (
				<>
					<PermissionCard title="Notifications" sub="Price moves on your picks and your daily deck." checked={notifications} onChange={setNotifications} />
					<p style={{ font: f(400, 11), color: DISC.faint }}>You can change these anytime in Settings.</p>
				</>
			)}
		</QuizStepShell>
	);
}
