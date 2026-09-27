import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { QuizStepShell } from "@/components/onboarding/QuizStepShell";
import { PermissionCard } from "@/components/profile/ProfileKit";
import { enableWebPush } from "@/lib/webPush";
import { DEFAULT_NOTIFICATION_PREFS } from "@/lib/notificationPrefs";
import { DISC } from "@/components/discover/discoverTheme";
import { f } from "@/components/phone/phone";

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
		>
			<PermissionCard title="Notifications" sub="Price moves on your picks and your daily deck." checked={notifications} onChange={setNotifications} />
			<p style={{ font: f(400, 11), color: DISC.faint }}>You can change these anytime in Settings.</p>
		</QuizStepShell>
	);
}
