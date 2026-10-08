import { A } from "@/app/assets";
import { col } from "@/app/FitCanvas";
import { Bar } from "@/app/SidebarSkeleton";

/** Figma 2:1991 "Desktop · Home · Loading" (section 10 States): the Home layout with skeleton bars. */
export function HomeSkeleton() {
	return (
		<div className="flex w-full flex-col items-start gap-[29px]" aria-busy="true">
			<div className="flex w-full flex-col items-start gap-[18px]">
				<div className="flex h-[40px] w-full items-center justify-between overflow-clip">
					<Bar w={111} h={14} r={7} className="shrink-0" />
					<div className="size-[35px] shrink-0 rounded-[17.5px] bg-[#223050]" />
				</div>
				<Bar w={360} h={12} />
			</div>

			<div className="flex flex-col items-center gap-[55px]" style={{ width: col(885) }}>
				<div className="flex w-full flex-col items-end gap-[19px]">
					<section className="relative h-[470px] w-full overflow-clip rounded-[16px] bg-[#171d2c]">
						<div className="absolute left-[28px] right-[24.563px] top-[26px] flex items-start justify-between">
							<div className="flex w-[360px] flex-col items-start gap-[4px]">
								<Bar w={259.2} h={12} />
								<Bar w={259.2} h={9.35} />
							</div>
							<img alt="" src={A.gaugeDim} className="h-[33.163px] w-[65.437px] shrink-0" />
						</div>

						<div className="absolute left-[calc(50%-193.54px)] top-[130px] flex h-[303.997px] w-[265.427px] -translate-x-1/2 items-center justify-center">
							<div className="relative h-[284.022px] w-[241.592px] flex-none rotate-5 overflow-clip rounded-[6.927px] bg-[#f9f9f9]">
								<div className="absolute left-[14.72px] top-[24.25px] flex w-[206.955px] flex-col items-start justify-center gap-[12.24px]">
									<Bar w={149.008} h={12} />
									<Bar w={139.032} h={12} />
								</div>
							</div>
						</div>
						<div className="absolute left-[calc(50%+4.03px)] top-[122px] h-[295.16px] w-[251.066px] -translate-x-1/2 overflow-clip rounded-[7.199px] bg-[#69b3ca]">
							<div className="absolute left-[15.3px] top-[25.2px] flex w-[215.071px] flex-col items-start justify-center gap-[17.998px]">
								<Bar w={154.851} h={12} />
								<Bar w={144.484} h={12} />
							</div>
						</div>
						<div className="absolute left-[calc(50%+197.21px)] top-[118.94px] flex h-[303.997px] w-[265.427px] -translate-x-1/2 items-center justify-center">
							<div className="relative h-[284.022px] w-[241.592px] flex-none -rotate-5 overflow-clip rounded-[6.927px] bg-[#f9f9f9]">
								<div className="absolute left-[14.72px] top-[24.25px] flex w-[206.955px] flex-col items-start justify-center gap-[12.24px]">
									<Bar w={149.008} h={12} />
									<Bar w={139.032} h={12} />
								</div>
							</div>
						</div>
					</section>

					<div className="flex w-full items-end justify-between">
						<div className="relative h-[119px] w-[48.588%] overflow-clip rounded-[8.229px] bg-[#171d2c]">
							<div className="absolute left-[calc(50%-0.17px)] top-[calc(50%+0.5px)] flex -translate-x-1/2 -translate-y-1/2 items-center justify-center gap-[15px]">
								<div className="h-[100px] w-[113px] shrink-0 rounded-[500px] bg-[#1b2640]" />
								<div className="flex flex-col items-start gap-[6.171px]">
									<div className="flex w-full flex-col items-start">
										<Bar w={123.84} h={8.8} />
									</div>
									<div className="flex w-[203.657px] flex-col items-start">
										<Bar w={146.633} h={12} />
									</div>
								</div>
							</div>
						</div>
						<div className="relative h-[119px] w-[48.588%] overflow-clip rounded-[8.229px] bg-[#69b3ca]">
							{/* "Box" 137.138x113.852 at (35.86, 23.76); the export bleeds 0.35%/0.25% past the box */}
							<img alt="" src={A.deckBoxDim} className="absolute left-[35.38px] top-[23.48px] h-[114.323px] w-[138.065px] max-w-none" />
							<div className="absolute left-[54.742%] top-[calc(50%+0.67px)] flex w-[160.457px] -translate-y-1/2 flex-col items-start gap-[10.286px]">
								<Bar w={115.529} h={12} />
								<div className="flex h-[32.914px] w-[126.514px] items-center justify-center gap-[3.086px] rounded-[15.429px] bg-[#0a1020] py-[4.728px]">
									<Bar w={44.64} h={8.25} />
									<img alt="" src={A.arrowRightDim} className="size-[16.457px]" />
								</div>
							</div>
						</div>
					</div>
				</div>

				<div className="flex w-[270px] flex-col items-center gap-[23px]">
					<div className="relative h-[51px] w-[136px] overflow-clip rounded-[163.643px]">
						<img alt="" src={A.seePicksPillDim} className="absolute inset-0 size-full" />
					</div>
					<Bar w={194.4} h={9.35} />
				</div>
			</div>
		</div>
	);
}
