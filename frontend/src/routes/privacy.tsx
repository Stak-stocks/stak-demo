import { createFileRoute } from "@tanstack/react-router";
import { LegalPage } from "@/components/legal/LegalPage";
import { PRIVACY_POLICY } from "@stak/shared";

export const Route = createFileRoute("/privacy")({
	component: () => <LegalPage doc={PRIVACY_POLICY} />,
});
