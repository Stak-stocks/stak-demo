import { toast } from "sonner";

const INVITE_TEXT = "Join me on STAK — swipe stocks you actually understand and practise with paper money. https://stak.app";

/** Share the invite where the browser can, otherwise copy it. Dismissing the share sheet isn't an error. */
export async function shareInvite() {
	try {
		if (navigator.share) await navigator.share({ title: "Invite a friend", text: INVITE_TEXT });
		else { await navigator.clipboard.writeText(INVITE_TEXT); toast.success("Invite copied"); }
	} catch { /* cancelled */ }
}
