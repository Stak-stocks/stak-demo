import type { LegalDoc } from "@/lib/legalText";

/** A Terms / Privacy page: the founders' document as readable text, open to anyone (the sign-up gate links here). */
export function LegalPage({ doc }: { doc: LegalDoc }) {
	return (
		<main className="min-h-full" style={{ background: "#0A1020" }}>
			<article className="mx-auto max-w-[760px] px-4 pb-16 pt-10 sm:px-6">
				<p className="text-[13px] font-semibold tracking-[0.12em]" style={{ color: "#69B3CA" }}>STAK</p>
				<h1 className="font-heading mt-2 text-[30px] font-semibold leading-[38px] text-white sm:text-[36px] sm:leading-[44px]">{doc.title}</h1>
				<p className="mt-2 text-[13.5px] italic" style={{ color: "#819ABB" }}>Effective date: {doc.effective}</p>
				<p className="mt-6 rounded-[12px] p-4 text-[12.5px] font-semibold leading-[19px]" style={{ background: "#171D2C", color: "#C7D2E3", border: "1px solid rgba(105,179,202,0.25)" }}>{doc.notice}</p>
				{doc.sections.map((s, i) => (
					<section key={i} className="mt-8">
						{s.heading && <h2 className="font-heading text-[21px] font-semibold leading-[28px] text-white">{s.heading}</h2>}
						{s.sub && <h3 className={`${s.heading ? "mt-4" : ""} text-[15.5px] font-semibold`} style={{ color: "#69B3CA" }}>{s.sub}</h3>}
						{s.blocks.map((b, j) => typeof b === "string"
							? <p key={j} className="mt-3 text-[14.5px] leading-[23px]" style={{ color: "#C7D2E3" }}>{b}</p>
							: <ul key={j} className="mt-3 list-disc space-y-1.5 pl-6 text-[14.5px] leading-[23px]" style={{ color: "#C7D2E3" }}>{b.list.map((item, k) => <li key={k}>{item}</li>)}</ul>)}
					</section>
				))}
			</article>
		</main>
	);
}
