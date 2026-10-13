/**
 * STAK AI's number check: which dollar and percent figures in an answer aren't in what it was given (the notes, its
 * tools' results, the person's own messages). A figure that isn't there came from the model's memory - the kind of
 * slip that once gave NVIDIA's earlier quarter as "$0.98 vs $0.90" (really $1.87 vs $1.79).
 */

/**
 * A figure: as written, its value (scaled: "$4.91T" and "$4.91 trillion" are both 4.91e12), the smallest step it was
 * written to (so "54%" is 54 give or take 0.5), and whether it's money or a percent.
 */
export interface Figure {
	text: string;
	value: number;
	step: number;
	unit: "$" | "%";
}

/** "$2.22", "$1,739.00", "$4.91T", "$92.7 billion", "-53.9%", "4.0 %", "12 percent". */
const FIGURE_RE = /\$\s?(\d{1,3}(?:,\d{3})+(?:\.\d+)?|\d+(?:\.\d+)?)(?:\s?(thousand|million|billion|trillion|[KMBT])\b)?|(\d{1,3}(?:,\d{3})+(?:\.\d+)?|\d+(?:\.\d+)?)\s?(?:%|percent\b)/gi;
const SCALE: Record<string, number> = { thousand: 1e3, k: 1e3, million: 1e6, m: 1e6, billion: 1e9, b: 1e9, trillion: 1e12, t: 1e12 };
/**
 * A worked example ("For example, imagine a company with 10 million shares..."): it runs to the end of its paragraph
 * ("Each share costs $10."). Only explicit markers - "say the" or "if a" also open plain statements of fact.
 */
const EXAMPLE_RE = /\b(for example|for instance|e\.g\.|as an example|imagine|suppose|let's say|say a company|say you|hypothetical(?:ly)?)\b/i;
/** Long-run background, which can come from memory ("historically about 10% a year"): that sentence only. */
const BACKGROUND_RE = /\b(historically|typically|on average|as a rule of thumb|in general|over the long (?:run|term))\b/i;
/**
 * A hypothetical in one sentence ("if a company's stock trades at $100 and EPS is $5, its P/E would be 20"): that
 * sentence only, so a fact after it ("If a company beats, shares often rise. AppLovin earned $0.98.") is still checked.
 */
const HYPOTHETICAL_RE = /\b(if (?:a|an) (?:company|company's|stock|stock's|business|share|investor|person)|would be|would have|would mean)\b/i;
/** Rounded on purpose ("about 40%" for 43.2%): within a tenth either way. */
const APPROX_RE = /\b(about|around|roughly|nearly|almost|approximately|close to|more than|over|under|some)\s*$/i;
/** Percentages the instructions themselves use ("a move under about 1% is normal noise"). */
const GENERIC_PERCENTS = new Set([1]);

const toNumber = (s: string) => Number(s.replace(/,/g, ""));
const stepOf = (s: string) => 10 ** -(s.includes(".") ? s.split(".")[1]!.length : 0);

/** Every figure in [text], with what comes just before it (for "about"). */
function* figuresIn(text: string): Generator<Figure & { before: string }> {
	for (const m of text.matchAll(FIGURE_RE)) {
		const raw = m[1] ?? m[3]!;
		const scale = m[2] ? SCALE[m[2].toLowerCase()] ?? 1 : 1;
		const value = toNumber(raw);
		if (!Number.isFinite(value)) continue;
		yield { text: m[0].trim(), value: value * scale, step: stepOf(raw) * scale, unit: m[1] ? "$" : "%", before: text.slice(Math.max(0, m.index! - 20), m.index) };
	}
}

/** The dollar and percent figures an answer states as facts: worked examples and long-run background are left out. */
export function answerFigures(answer: string): (Figure & { approx: boolean })[] {
	const figures: (Figure & { approx: boolean })[] = [];
	for (const paragraph of answer.split(/\n\s*\n/)) {
		let inExample = false;
		for (const sentence of paragraph.split(/(?<=[.!?])\s+|\n+/)) {
			inExample ||= EXAMPLE_RE.test(sentence);
			if (inExample || BACKGROUND_RE.test(sentence) || HYPOTHETICAL_RE.test(sentence)) continue;
			for (const f of figuresIn(sentence)) {
				if (f.unit === "%" && GENERIC_PERCENTS.has(f.value)) continue;
				const { before, ...figure } = f;
				figures.push({ ...figure, approx: APPROX_RE.test(before) });
			}
		}
	}
	return figures;
}

/** The evidence's money and percents (signs aside). */
function knownFigures(evidence: string): Record<"$" | "%", number[]> {
	const known: Record<"$" | "%", Set<number>> = { $: new Set(), "%": new Set() };
	for (const f of figuresIn(evidence)) known[f.unit].add(f.value);
	return { $: [...known.$], "%": [...known["%"]] };
}

/**
 * Whether [figure] is one of the evidence's figures of the same kind, as the answer rounded it ("53.9%" or "54%" for
 * 53.85%, "$2.14" for $2.1384, "$4.91 trillion" for $4.91T; "about 40%" for 43.2%), or - money only - the exact gap
 * between two ("beat by $0.08": $2.22 - $2.14). Percent gaps aren't allowed: with twenty-odd percents in the notes,
 * their gaps cover nearly every whole number, so an invented "up 12%" would pass.
 */
function supported(figure: Figure & { approx: boolean }, known: Record<"$" | "%", number[]>): boolean {
	const same = known[figure.unit];
	const tolerance = figure.step / 2 + 1e-9;
	const near = (v: number) => Math.abs(v - figure.value) <= tolerance || (figure.approx && Math.abs(v - figure.value) <= Math.abs(v) * 0.1);
	if (same.some(near)) return true;
	if (figure.unit === "$" && figure.step <= 0.01) {
		for (let i = 0; i < same.length; i++) {
			for (let j = i + 1; j < same.length; j++) if (Math.abs(Math.abs(same[i]! - same[j]!) - figure.value) <= 0.005) return true;
		}
	}
	return false;
}

/** The figures in [answer] that [evidence] doesn't contain, as written ("$0.98", "12.5%"); empty when all check out. */
export function unsupportedFigures(answer: string, evidence: string): string[] {
	const known = knownFigures(evidence);
	return [...new Set(answerFigures(answer).filter((f) => !supported(f, known)).map((f) => f.text))];
}
