import { createFileRoute } from "@tanstack/react-router";
import { LegalPage } from "@/components/legal/LegalPage";
import { TERMS_OF_SERVICE } from "@/lib/legalText";

export const Route = createFileRoute("/terms")({
	component: () => <LegalPage doc={TERMS_OF_SERVICE} />,
});
