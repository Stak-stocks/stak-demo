import { INVITE_TEXT, shareText } from "@/lib/share";

/** Share the invite where the browser can, otherwise copy it. */
export function shareInvite() {
	return shareText(INVITE_TEXT, "Invite a friend", "Invite copied");
}
