import type { CSSProperties } from "react";
import { A } from "@/app/assets";
import { Bar } from "@/app/SidebarSkeleton";
import { GLOW_FILTER, GRADIENT, hairline } from "@/app/simulate/ui";

const L = A.loading;

/** Figma 2:2305 "Desktop · Deck · Loading" (section 10 States): header at y 58, the card stack at 15% opacity, two button shells. */
export function DeckSkeleton() {
	return (
		<div className="relative h-[936px] w-[1144px]" aria-busy="true">
			{/* header 2:2334 at (256, 58) */}
			<div className="absolute left-0 top-[-30px] flex h-[92px] w-[1087px] items-center justify-between">
				<div className="flex flex-col items-start gap-[6px] overflow-clip">
					<Bar w={92.16} h={12} />
					<Bar w={81.36} h={8} />
				</div>
				<div className="relative size-[52.8px] overflow-clip">
					<img alt="" src={L.ring} className="absolute left-0 top-0 size-[52.8px]" />
					<Bar w={28} h={9.35} className="absolute left-0 top-0" />
				</div>
			</div>

			{/* stack 2:2347 at (417, 196), 806.229 wide */}
			<div className="absolute left-[161px] top-[108px] flex w-[806.229px] flex-col items-center gap-[64px]">
				<div className="flex w-full flex-col items-center gap-[35px]">
					<div className="relative h-[458.231px] w-[690.509px]" style={{ opacity: 0.15 }}>
						{/* right card (2:2350), -5deg */}
						<div className="absolute left-[343.05px] top-[3.76px] flex h-[423.583px] w-[347.459px] items-center justify-center">
							<div className="flex-none -rotate-5">
								<DeckCardShell
									w={313.989}
									h={397.73}
									radius={19.736}
									from="#263d5d"
									opacity={0.65}
									gap={22}
									pad="5px 0 0"
									image={{ w: 305.018, h: 205.439, r: 16.148, bg: "#2f486e" }}
									art={
										<div className="absolute left-1/2 top-[30.26px] h-[242.684px] w-[179.422px] -translate-x-1/2">
											<img alt="" src={L.deckGroupA} className="absolute left-[-22.41px] top-[66.45px] block h-[210.101px] w-[230.092px] max-w-none" />
											<img alt="" src={L.deckVectorA} className="absolute left-[31.41px] top-[-4.48px] block h-[129.687px] w-[120.635px] max-w-none" />
										</div>
									}
									overlay={{ pad: "0 16px 14px", gap: 17, inner: 7, eyebrow: 64.8, title: 203.032, priceGap: 8, price: [52.56, 12], change: [45.36, 8] }}
									tip={{ pad: "8px 11px", r: 8.971, gap: 7, bar: [161.992, 12] }}
									save={{ left: 242.67, top: 8.07, pad: "6px 12px", r: 14.354, gap: 5, bar: [28, 8], icon: L.bookmarkA, iconSize: 10.765 }}
								/>
							</div>
						</div>
						{/* left card (2:2391), +5deg */}
						<div className="absolute left-0 top-0 flex h-[439.887px] w-[368.911px] items-center justify-center">
							<div className="flex-none rotate-5">
								<DeckCardShell
									w={334.247}
									h={412.324}
									radius={21.01}
									from="#283e5d"
									opacity={0.85}
									gap={24}
									pad="4px 0"
									image={{ w: 324.697, h: 218.693, r: 17.19, bg: "#253a59" }}
									art={
										<div className="absolute left-1/2 top-[32.22px] h-[258.341px] w-[190.998px] -translate-x-1/2">
											<img alt="" src={L.deckGroupB} className="absolute left-[-23.86px] top-[-4.78px] block h-[299.168px] w-[244.937px] max-w-none" />
										</div>
									}
									overlay={{ pad: "0 17px 15px", gap: 18, inner: 8, eyebrow: 51.84, title: 216.178, priceGap: 9, price: [56.88, 12], change: [46.08, 8] }}
									tip={{ pad: "9px 11px", r: 9.55, gap: 8, bar: [174.418, 12] }}
									save={{ left: 258.33, top: 8.59, pad: "7px 12px", r: 15.28, gap: 6, bar: [28, 8.25], icon: L.bookmarkB, iconSize: 11.46 }}
								/>
							</div>
						</div>
						{/* centre card (2:2430) */}
						<div className="absolute left-[160.86px] top-[1.5px]">
							<DeckCardShell
								w={371.385}
								h={456.731}
								radius={23.344}
								from="#152a47"
								opacity={1}
								gap={27}
								pad="4px 0"
								image={{ w: 360.774, h: 242.992, r: 19.1, bg: "#142844" }}
								art={
									<div className="absolute left-1/2 top-[35.8px] h-[287.046px] w-[212.22px] -translate-x-1/2">
										<img alt="" src={L.deckGroupC} className="absolute left-[-26.51px] top-[78.6px] block h-[248.508px] w-[272.152px] max-w-none" />
										<img alt="" src={L.deckVectorC} className="absolute left-[37.15px] top-[-5.31px] block h-[153.393px] w-[142.687px] max-w-none" />
										<div className="absolute left-[31.83px] top-[18.32px] size-[147.493px] bg-[#1b2640]" style={{ opacity: 0.15 }} />
									</div>
								}
								overlay={{ pad: "0 19px 17px", gap: 20, inner: 8, eyebrow: 69.84, title: 240.037, priceGap: 10, price: [58.32, 12], change: [53.28, 8.25] }}
								tip={{ pad: "10px 13px", r: 10.611, gap: 8, bar: [195.397, 8.8] }}
								save={{ left: 280.13, top: 6.37, pad: "7px 14px", r: 16.978, gap: 6, bar: [28, 9.35], icon: L.bookmarkC, iconSize: 12.733, inImage: true }}
							/>
						</div>
					</div>
					<div className="size-[40px]" />
				</div>

				<div className="flex w-[320px] flex-col items-center gap-[11px]">
					<div
						className="h-[52px] w-full rounded-[6px]"
						style={{ backgroundImage: GRADIENT, boxShadow: hairline(0.361, "rgba(101,158,173,0.63)"), filter: GLOW_FILTER }}
					/>
					<div className="h-[52px] w-full rounded-[6px]" style={{ boxShadow: hairline(0.361, "rgba(101,158,173,0.63)"), filter: GLOW_FILTER }} />
				</div>
			</div>
		</div>
	);
}

type Overlay = { pad: string; gap: number; inner: number; eyebrow: number; title: number; priceGap: number; price: [number, number]; change: [number, number] };
type Tip = { pad: string; r: number; gap: number; bar: [number, number] };
type Save = { left: number; top: number; pad: string; r: number; gap: number; bar: [number, number]; icon: string; iconSize: number; inImage?: boolean };

function DeckCardShell({
	w,
	h,
	radius,
	from,
	opacity,
	gap,
	pad,
	image,
	art,
	overlay,
	tip,
	save,
}: {
	w: number;
	h: number;
	radius: number;
	from: string;
	opacity: number;
	gap: number;
	pad: string;
	image: { w: number; h: number; r: number; bg: string };
	art: React.ReactNode;
	overlay: Overlay;
	tip: Tip;
	save: Save;
}) {
	const style: CSSProperties = {
		width: w,
		height: h,
		borderRadius: radius,
		backgroundImage: `linear-gradient(to bottom, ${from}, #0c1526)`,
		opacity,
		gap,
		padding: pad,
	};
	const savePill = (
		<div
			className="absolute flex items-center justify-center overflow-clip bg-[rgba(255,255,255,0.09)]"
			style={{ left: save.left, top: save.top, padding: save.pad, borderRadius: save.r, gap: save.gap }}
		>
			<Bar w={save.bar[0]} h={save.bar[1]} />
			<img alt="" src={save.icon} style={{ width: save.iconSize, height: save.iconSize }} className="shrink-0" />
		</div>
	);
	return (
		<div className="relative flex flex-col items-center overflow-clip" style={style}>
			<div className="relative shrink-0 overflow-clip" style={{ width: image.w, height: image.h, borderRadius: image.r, backgroundColor: image.bg }}>
				{art}
				{save.inImage && savePill}
			</div>
			<div className="flex w-full flex-col items-start overflow-clip" style={{ padding: overlay.pad }}>
				<div className="flex w-full flex-col items-start" style={{ gap: overlay.gap }}>
					<div className="flex w-full flex-col items-start" style={{ gap: overlay.inner }}>
						<Bar w={overlay.eyebrow} h={8} />
						<div className="flex w-full flex-col items-start" style={{ gap: overlay.inner }}>
							<Bar w={overlay.title} h={12} />
							<div className="flex items-baseline overflow-clip" style={{ gap: overlay.priceGap }}>
								<Bar w={overlay.price[0]} h={overlay.price[1]} />
								<Bar w={overlay.change[0]} h={overlay.change[1]} />
							</div>
						</div>
					</div>
					<div className="flex w-full items-center overflow-clip bg-[rgba(105,179,202,0.1)]" style={{ padding: tip.pad, borderRadius: tip.r, gap: tip.gap }}>
						<Bar w={28} h={8} />
						<Bar w={tip.bar[0]} h={tip.bar[1]} />
					</div>
				</div>
			</div>
			{!save.inImage && savePill}
		</div>
	);
}
