import { A } from "@/app/assets";
import { Bar } from "@/app/SidebarSkeleton";
import { GLOW_FILTER, GRADIENT, hairline } from "@/app/simulate/ui";

const CARD = "flex w-full flex-col items-start gap-[12px] overflow-clip rounded-[16px] bg-[#181f30] px-[16px] py-[14px]";
const L = A.loading;

/** Figma 2:2113 "Desktop · Stock detail · Loading" (section 10 States). Back block at y 44, columns at y 160. */
export function StockDetailSkeleton() {
	return (
		<div className="relative h-[936px] w-[1144px]" aria-busy="true">
			<div className="absolute left-[1px] top-[-44px] flex flex-col items-start gap-[31px]">
				<div className="size-[40px] rounded-[20px] bg-[#223050]" />
				<Bar w={94.32} h={11.55} />
			</div>

			<div className="absolute left-0 top-[72px] flex items-start justify-center gap-[40px]">
				<div className="flex w-[744px] flex-col items-start gap-[14px] overflow-clip">
					{/* Performance chart */}
					<div className="relative h-[220px] w-[744px] overflow-clip rounded-[16px] bg-[#181f30]">
						<img alt="" src={L.chartDim} className="absolute left-[13px] top-[58.69px] block h-[124.484px] w-[692px] max-w-none" />
						<div className="absolute left-[566px] top-[182px] flex items-start gap-[8px] overflow-clip">
							{[0, 1, 2, 3].map((k) => (
								<div key={k} className="flex items-start overflow-clip rounded-[8px] px-[10px] py-[4px]" style={k === 2 ? { backgroundColor: "#181f30" } : undefined}>
									<Bar w={28} h={8} />
								</div>
							))}
						</div>
						<div className="absolute left-[40px] top-[20px] flex flex-col items-start gap-[4px] overflow-clip">
							<Bar w={65.52} h={8.8} />
							<Bar w={100.8} h={12} />
							<Bar w={56.88} h={9.35} />
						</div>
					</div>

					{/* Save intro */}
					<div className="flex w-full flex-col items-start overflow-clip rounded-[16px] bg-[#181f30] px-[16px] py-[12px]">
						<div className="flex h-[22px] w-full items-center justify-between overflow-clip">
							<div className="flex items-center gap-[8px] overflow-clip">
								<img alt="" src={L.bookmarkDim} className="size-[12px] shrink-0" />
								<Bar w={60.48} h={8} />
							</div>
						</div>
						<Bar w={355.68} h={8} />
					</div>

					{/* Risk fit */}
					<div className={CARD}>
						<div className="flex h-[24px] w-full items-center justify-between overflow-clip">
							<Bar w={38.88} h={10.45} />
							<div className="flex items-start overflow-clip rounded-[999px] bg-[#223050] px-[10px] py-[4px]">
								<Bar w={47.52} h={8} />
							</div>
						</div>
						<div className="relative h-[8px] w-full overflow-clip rounded-[4px] bg-[#293144]">
							<img alt="" src={L.marker} className="absolute left-[88px] top-[-3px] size-[14px]" />
						</div>
						<div className="flex h-[14px] w-full items-start justify-between overflow-clip">
							<Bar w={28} h={8} />
							<Bar w={28} h={8} />
						</div>
						<Bar w={175.68} h={8} />
					</div>

					{/* Numbers that matter */}
					<div className={CARD}>
						<Bar w={116.64} h={10.45} />
						<div className="flex w-full items-start gap-[8px] overflow-clip">
							<StatCell bars={[[28.8, 8], [28, 11.55], [28, 8]]} />
							<StatCell bars={[[54, 8], [28.08, 11.55], [28, 8]]} />
							<StatCell bars={[[43.2, 8], [38.16, 11.55], [31.68, 8]]} outlined />
						</div>
						<Bar w={234.72} h={12} />
						<Bar w={139.68} h={8} />
					</div>

					{/* News signal */}
					<div className={CARD}>
						<Bar w={67.68} h={10.45} />
						<Bar w={107.28} h={8} />
						<Bar w={234.72} h={8} />
						<Bar w={234.72} h={8} />
						<div className="flex items-start gap-[12px]">
							{[
								[50.4, 28],
								[41.76, 28],
								[64.08, 28],
								[60.48, 30.96],
							].map(([source, chip], k) => (
								<div key={k} className="flex w-[205px] shrink-0 flex-col items-start gap-[8px] overflow-clip rounded-[12px] bg-[#181f30] p-[12px]">
									<div className="flex h-[22px] w-full items-center justify-between overflow-clip">
										<Bar w={source} h={8} />
										<div className="flex items-start overflow-clip rounded-[999px] bg-[rgba(255,255,255,0.08)] px-[8px] py-[3px]">
											<Bar w={chip} h={8} />
										</div>
									</div>
									<Bar w={124.56} h={12} />
								</div>
							))}
						</div>
					</div>
				</div>

				{/* Action rail */}
				<div className="flex w-[360px] flex-col items-start gap-[14px] overflow-clip">
					<div className="flex w-full flex-col items-start gap-[10px] overflow-clip rounded-[16px] bg-[#181f30] p-[16px]">
						<div className="flex w-full flex-col items-start gap-[10px]">
							<div
								className="h-[52px] w-full rounded-[6px]"
								style={{ backgroundImage: GRADIENT, boxShadow: hairline(0.361, "rgba(101,158,173,0.63)"), filter: GLOW_FILTER }}
							/>
							<div
								className="flex h-[52px] w-full items-center justify-center overflow-clip rounded-[6px]"
								style={{ boxShadow: hairline(0.361, "rgba(101,158,173,0.63)"), filter: GLOW_FILTER }}
							>
								<Bar w={59.04} h={11.55} />
							</div>
						</div>
						<Bar w={95.04} h={8} />
					</div>
					<div className={CARD}>
						<div className="flex w-full items-start justify-between">
							<Bar w={70.56} h={10.45} />
							<img alt="" src={L.caretA} className="size-[20px] shrink-0" />
						</div>
						<Bar w={51.84} h={8} />
					</div>
					<div className="flex h-[52px] w-full items-center justify-between overflow-clip rounded-[16px] bg-[#181f30] px-[16px] py-[14px]">
						<div className="flex flex-col items-start gap-[2px] overflow-clip">
							<Bar w={98.64} h={9.9} />
							<Bar w={64.08} h={8} />
						</div>
						<img alt="" src={L.caretB} className="size-[20px] shrink-0" />
					</div>
				</div>
			</div>
		</div>
	);
}

function StatCell({ bars, outlined }: { bars: [number, number][]; outlined?: boolean }) {
	return (
		<div
			className="flex min-w-px flex-1 flex-col items-start gap-[4px] overflow-clip rounded-[12px] bg-[#181f30] p-[10px]"
			style={outlined ? { boxShadow: hairline(1, "#212d4b") } : undefined}
		>
			{bars.map(([w, h], k) => (
				<Bar key={k} w={w} h={h} />
			))}
		</div>
	);
}
