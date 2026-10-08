import { createFileRoute, Link } from "@tanstack/react-router";
import { A } from "@/app/assets";
import { PageHeader } from "@/app/PageHeader";
import { account } from "@/app/data/account";
import { homePromos, marketMood } from "@/app/data/home";

type HomeSearch = { firstRun?: boolean };

export const Route = createFileRoute("/_app/home")({
	validateSearch: (search: Record<string, unknown>): HomeSearch => ({
		firstRun: search.firstRun === true || search.firstRun === 1 || search.firstRun === "1" ? true : undefined,
	}),
	component: HomePage,
});

/** Figma 2:414 "Desktop · Home · Main" and 2:532 "Desktop · Home · first run" (no picks block). */
function HomePage() {
	const { firstRun } = Route.useSearch();
	return (
		<div className="flex w-full flex-col items-start gap-[29px]">
			<PageHeader title={account.greeting} />
			<div className="flex flex-col items-center gap-[55px]">
				<div className="flex w-full flex-col items-end gap-[19px]">
					<MarketMoodCard />
					<div className="flex w-full items-end justify-between">
						<WhyCard />
						<DeckPromoCard />
					</div>
				</div>
				{!firstRun && <SeePicks />}
			</div>
		</div>
	);
}

function MarketMoodCard() {
	const [left, mid, right] = marketMood.deck;
	return (
		<section className="relative h-[470px] w-[885px] overflow-clip rounded-[16px] bg-[#171d2c]">
			<div className="absolute left-[28px] top-[26px] flex items-start gap-[407px]">
				<div className="flex w-[360px] flex-col items-start gap-[4px]">
					<h2 className="w-full font-sora text-[22px] font-semibold leading-[28px] text-[#f2f6fc]">{marketMood.title}</h2>
					<p className="w-full font-geist text-[13px] leading-[17px] text-[#819abb]">{marketMood.subtitle}</p>
				</div>
				<img alt="" src={A.gauge} className="h-[33.163px] w-[65.437px] shrink-0" />
			</div>

			{/* left card, rotated +5deg */}
			<div className="absolute left-[calc(50%-193.54px)] top-[130px] flex h-[303.997px] w-[265.427px] -translate-x-1/2 items-center justify-center">
				<article className="relative h-[284.022px] w-[241.592px] flex-none rotate-5 overflow-clip rounded-[6.927px] bg-[#f9f9f9]">
					<div className="absolute left-[14.72px] top-[24.25px] flex w-[206.955px] flex-col items-start justify-center gap-[12.24px] text-[#0e162b]">
						<p className="w-full font-sora text-[16.32px] font-medium leading-[21px]">{left.title}</p>
						<p className="w-[193.1px] font-geist text-[12.24px] font-light leading-[16px]">{left.body}</p>
					</div>
					<p className="absolute left-[15.74px] top-[192.54px] whitespace-nowrap font-geist text-[10px] font-medium text-[rgba(14,22,43,0.55)]">
						{left.source}
					</p>
				</article>
			</div>

			{/* middle card */}
			<article className="absolute left-[calc(50%+4.03px)] top-[122px] h-[295.16px] w-[251.066px] -translate-x-1/2 overflow-clip rounded-[7.199px] bg-[#69b3ca]">
				<div className="absolute left-[15.3px] top-[25.2px] flex w-[215.071px] flex-col items-start justify-center gap-[17.998px] text-[#0e162b]">
					<p className="w-full font-sora text-[16.96px] font-medium leading-[21px]">{mid.title}</p>
					<p className="w-[200.673px] font-geist text-[12.598px] leading-[16px]">{mid.body}</p>
				</div>
				<p className="absolute left-[15px] top-[221px] whitespace-nowrap font-geist text-[10px] font-medium text-[rgba(14,22,43,0.55)]">
					{mid.source}
				</p>
			</article>

			{/* right card, rotated -5deg */}
			<div className="absolute left-[calc(50%+197.21px)] top-[118.94px] flex h-[303.997px] w-[265.427px] -translate-x-1/2 items-center justify-center">
				<article className="relative h-[284.022px] w-[241.592px] flex-none -rotate-5 overflow-clip rounded-[6.927px] bg-[#f9f9f9]">
					<div className="absolute left-[14.72px] top-[24.25px] flex w-[206.955px] flex-col items-start justify-center gap-[12.24px] text-[#0e162b]">
						<p className="w-full font-sora text-[16.32px] font-medium leading-[21px]">{right.title}</p>
						<p className="w-[193.1px] font-geist text-[12.24px] font-light leading-[16px]">{right.body}</p>
					</div>
					<p className="absolute left-[19.66px] top-[211.25px] whitespace-nowrap font-geist text-[10px] font-medium text-[rgba(14,22,43,0.55)]">
						{right.source}
					</p>
				</article>
			</div>
		</section>
	);
}

function WhyCard() {
	return (
		<article className="relative h-[119px] w-[430px] overflow-clip rounded-[8.229px] bg-[#171d2c]">
			<div className="absolute left-[calc(50%-0.5px)] top-[calc(50%-0.5px)] flex w-[341px] -translate-x-1/2 -translate-y-1/2 items-center gap-[20px]">
				<img alt="" src={A.cautionIcon} className="size-[108px] shrink-0 object-cover" />
				<div className="flex flex-col items-start gap-[6.171px]">
					<p className="whitespace-nowrap font-sora text-[14.4px] leading-[15.429px] text-white">{homePromos.why.title}</p>
					<p className="w-[203.657px] font-geist text-[12.343px] font-light leading-[15.429px] text-white">{homePromos.why.body}</p>
				</div>
			</div>
		</article>
	);
}

function DeckPromoCard() {
	return (
		<article className="relative h-[119px] w-[430px] overflow-clip rounded-[8.229px] bg-[#69b3ca]">
			{/* "Illustration" group (box + coins + shadow), exported at 2x, clipped by the card exactly as in Figma */}
			<img alt="" src={A.deckBoxIllustration} className="absolute left-[29.68px] top-0 h-[119px] w-[159px]" />
			<div className="absolute left-[235.39px] top-[calc(50%+0.67px)] flex w-[160.457px] -translate-y-1/2 flex-col items-start gap-[10.286px]">
				<p className="w-full font-geist text-[12.343px] font-light leading-[15.429px] text-black">{homePromos.deck.body}</p>
				<Link
					to="/discover"
					className="flex h-[32.914px] w-[126.514px] items-center justify-center gap-[3.086px] rounded-[15.429px] bg-[#0a1020] py-[4.728px]"
				>
					<span className="whitespace-nowrap font-geist text-[11.82px] font-medium text-white">{homePromos.deck.cta}</span>
					<img alt="" src={A.arrowRight} className="size-[16.457px]" />
				</Link>
			</div>
		</article>
	);
}

function SeePicks() {
	return (
		<div className="flex w-[270px] flex-col items-center gap-[23px]">
			<Link
				to="/discover"
				aria-label={homePromos.picks.cta}
				className="relative block h-[51px] w-[136px] overflow-clip rounded-[163.643px]"
			>
				{/* glass pill ("Container" 2:516) exported at 2x; the label is part of the export */}
				<img alt={homePromos.picks.cta} src={A.seePicksPill} className="absolute inset-0 size-full" />
			</Link>
			<p className="w-full font-geist text-[13px] leading-[17px] text-[#819abb]">{homePromos.picks.caption}</p>
		</div>
	);
}
