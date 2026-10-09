import { Link } from "@tanstack/react-router";
import type { NewsCardData } from "./data";

/** "News card" (Figma 2:4408): 552x100, thumb 66, tag pill, title, source. */
export function NewsCard({ card }: { card: NewsCardData }) {
	return (
		<Link
			to="/news/$id"
			params={{ id: card.id }}
			className="stak-press flex h-[100px] w-full cursor-pointer items-center gap-[14px] overflow-clip rounded-[14px] bg-[#181f30] px-[16px] py-[14px]"
		>
			<img alt="" src={card.thumb} width={66} height={66} loading="lazy" className="size-[66px] shrink-0 rounded-[11px] object-cover" />
			<div className="flex h-[60px] min-w-0 flex-1 flex-col items-start gap-[5px] overflow-clip">
				<span className="flex items-start overflow-clip rounded-[999px] bg-[#242b3d] px-[8px] py-[3px]">
					<span className="whitespace-nowrap font-geist text-[8px] font-medium leading-[10px] text-[#5bd7e4]">{card.tag}</span>
				</span>
				<span className="w-[calc(100%-10px)] font-geist text-[13px] font-medium leading-[17px] text-[#f2f6fc]">{card.title}</span>
				<span className="whitespace-nowrap font-geist text-[11px] leading-[14px] text-[#819abb]">{card.source}</span>
			</div>
		</Link>
	);
}

export function NewsColumn({ title, cards, emptyText }: { title: string; cards: readonly NewsCardData[]; emptyText?: string }) {
	return (
		<section className="flex min-w-0 flex-1 flex-col items-start gap-[15px]">
			<h2 className="w-full font-sora text-[18px] font-semibold leading-[23px] text-[#f2f6fc]">{title}</h2>
			<div className="flex w-full flex-col items-start gap-[16px]">
				{cards.map((card, i) => (
					<NewsCard key={`${card.id}-${i}`} card={card} />
				))}
				{cards.length === 0 && emptyText && <p className="font-geist text-[13px] leading-[17px] text-[#819abb]">{emptyText}</p>}
			</div>
		</section>
	);
}
