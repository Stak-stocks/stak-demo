import { type CSSProperties, type ReactNode, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

type Props = {
	/** accessible name of the dialog ("Buy NVDA?") */
	label: string;
	/** `alertdialog` for a confirmation that interrupts (delete account); the native dialog role otherwise */
	role?: "dialog" | "alertdialog";
	/** id of a visible title inside the sheet, used as the name instead of `label` */
	labelledBy?: string;
	/** id of the paragraph that explains the consequence, read out with the name */
	describedBy?: string;
	onClose: () => void;
	/** the scrim colour, which the frames vary per sheet */
	scrim?: string;
	/** vertical offset of the panel centre from the viewport centre (Figma: +88.5 on the deck, +0.5 on the detail) */
	offsetY?: number;
	width?: number;
	className?: string;
	children: ReactNode;
};

/**
 * The 480-wide sheet over a scrim ("Sheet" 2:1421, 2:3385 et al.), built on a native modal
 * <dialog>: it sits in the top layer, traps focus, returns it on close, and answers Esc, the
 * back gesture and a click on the scrim (the dialog element itself is the scrim). The panel
 * keeps the frames' geometry: 480 wide, 20px radius, centred with an authored offset.
 *
 * Initial focus goes to the first focusable control (the dialog's default) unless a descendant
 * carries `data-autofocus`, which a confirmation uses to start on its safe action. The sheet is
 * always unmounted to close, and React detaches the <dialog> before this effect's cleanup runs,
 * so the native focus return cannot fire: the opener is remembered on open and refocused here.
 */
export function Sheet({ label, role, labelledBy, describedBy, onClose, scrim = "rgba(0,0,0,0.66)", offsetY = 0, width = 480, className, children }: Props) {
	const ref = useRef<HTMLDialogElement>(null);
	const close = useRef(onClose);
	close.current = onClose;

	useEffect(() => {
		const d = ref.current;
		if (!d) return;
		const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
		if (!d.open) {
			try {
				d.showModal();
			} catch {
				d.setAttribute("open", "");
			}
			d.querySelector<HTMLElement>("[data-autofocus]")?.focus();
		}
		const onCancel = (e: Event) => {
			e.preventDefault();
			close.current();
		};
		// a click whose target is the dialog itself landed on the scrim, outside the panel
		const onClick = (e: MouseEvent) => {
			if (e.target === d) close.current();
		};
		d.addEventListener("cancel", onCancel);
		d.addEventListener("click", onClick);
		return () => {
			d.removeEventListener("cancel", onCancel);
			d.removeEventListener("click", onClick);
			if (d.open) d.close();
			if (opener?.isConnected) opener.focus();
		};
	}, []);

	return (
		<dialog
			ref={ref}
			role={role}
			aria-label={labelledBy ? undefined : label}
			aria-labelledby={labelledBy}
			aria-describedby={describedBy}
			className="stak-dialog stak-sheet-in"
			style={{ "--stak-scrim": scrim } as CSSProperties}
			data-sheet
		>
			<div
				className={cn(
					"absolute left-1/2 flex -translate-x-1/2 -translate-y-1/2 flex-col items-start gap-[14px] overflow-clip rounded-[20px] bg-[#181f30] px-[20px] pt-[10px] pb-[30px]",
					className,
				)}
				style={{ top: `calc(50% + ${offsetY}px)`, width }}
			>
				<div className="flex w-full items-start justify-center overflow-clip pb-[4px]">
					<div className="h-[4px] w-[40px] rounded-[2px] bg-[#2a3346]" />
				</div>
				{children}
			</div>
		</dialog>
	);
}
