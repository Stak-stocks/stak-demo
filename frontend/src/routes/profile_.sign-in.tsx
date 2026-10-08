import { createFileRoute } from "@tanstack/react-router";
import { useAuth } from "@/context/AuthContext";
import { Caption, SettingsCard, SettingsLinkRow, SettingsScaffold } from "@/components/profile/ProfileKit";

export const Route = createFileRoute("/profile_/sign-in")({
	component: SignInPage,
});

/** Android's Sign-in page: how this account signs in, and the email. Read-only. */
function SignInPage() {
	const { appUser } = useAuth();
	return (
		<SettingsScaffold title="Sign-in">
			<SettingsCard>
				<SettingsLinkRow label="Signed in with" value={appUser?.provider === "google.com" ? "Google" : "Email and password"} chevron={false} />
				{appUser?.email && <SettingsLinkRow label="Email" value={appUser.email} chevron={false} />}
			</SettingsCard>
			<Caption>Sign in the same way next time, on this device or a new one. Your saved stocks and taste come with you.</Caption>
		</SettingsScaffold>
	);
}
