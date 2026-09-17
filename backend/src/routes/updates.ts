import { Router } from "express";
import { authMiddleware, type AuthenticatedRequest } from "../authMiddleware.js";
import { brands } from "@stak/shared/brands";
import { pgQuery } from "../lib/postgres.js";

/**
 * "Updates in your STAK": what changed at the companies this user saved.
 *
 * An update belongs to a company (stock_updates) and is shared; whether it has been
 * read belongs to the user (update_reads). Only updates from after a company was saved
 * count - STAK is telling the user what changed since they cared, not reciting history.
 */
export const updatesRouter = Router();

const BRAND_BY_ID = new Map(brands.map((b) => [b.id, { ticker: b.ticker.toUpperCase(), name: b.name }]));

/** How far back the inbox looks. Older changes are history, not news. */
const WINDOW_DAYS = 14;

// GET /api/me/updates — the user's saved companies' recent changes, newest first.
updatesRouter.get("/", authMiddleware, async (req: AuthenticatedRequest, res) => {
	try {
		const uid = req.user!.uid;
		const saved = await pgQuery<{ brand_id: string; saved_at: string }>(
			`select brand_id, saved_at from stak_brands where uid = $1`, [uid],
		);
		if (saved.rows.length === 0) { res.json({ updates: [], unread: 0 }); return; }

		const savedAt = new Map<string, number>();
		for (const row of saved.rows) {
			const brand = BRAND_BY_ID.get(row.brand_id);
			if (brand) savedAt.set(brand.ticker, new Date(row.saved_at).getTime());
		}
		const tickers = [...savedAt.keys()];
		const since = new Date(Date.now() - WINDOW_DAYS * 24 * 60 * 60 * 1000).toISOString();

		// "Since you saved" is part of the query, not a filter over its results: applied
		// afterwards, 50 rows for long-held companies could crowd out a new save's own.
		const rows = await pgQuery<{
			id: string; ticker: string; kind: string; title: string; body: string; watch: string | null;
			sources: { source: string; url: string; headline: string; datetime: number }[] | null;
			occurred_at: string; read_at: string | null;
		}>(
			`select u.id, u.ticker, u.kind, u.title, u.body, u.watch, u.sources, u.occurred_at, r.read_at
			 from stock_updates u
			 join unnest($2::text[], $4::timestamptz[]) as s(ticker, saved_at) on s.ticker = u.ticker
			 left join update_reads r on r.update_id = u.id and r.uid = $1
			 where u.occurred_at >= $3
			   -- Measured from when the NEWS happened, not from when the job noticed it: the
			   -- detector reads a three-day window, so a run today can pick up a story from
			   -- before the user saved the company - and the card would date itself "2d ago"
			   -- under a save made yesterday.
			   and coalesce(
			         (select max((e->>'datetime')::bigint) from jsonb_array_elements(u.sources) e),
			         extract(epoch from u.occurred_at)::bigint
			       ) >= extract(epoch from s.saved_at)::bigint
			 order by u.occurred_at desc
			 limit 50`,
			[uid, tickers, since, tickers.map((t) => new Date(savedAt.get(t) ?? 0).toISOString())],
		);

		const brandByTicker = new Map([...BRAND_BY_ID.values()].map((b) => [b.ticker, b.name]));
		const updates = rows.rows
			.map((r) => ({
				id: Number(r.id),
				ticker: r.ticker,
				company: brandByTicker.get(r.ticker) ?? r.ticker,
				kind: r.kind,
				title: r.title,
				body: r.body,
				watch: r.watch,
				sources: r.sources ?? [],
				occurredAt: r.occurred_at,
				read: r.read_at != null,
			}));

		res.json({ updates, unread: updates.filter((u) => !u.read).length });
	} catch (error) {
		console.error("Error fetching updates:", error);
		res.status(500).json({ error: "Failed to fetch updates" });
	}
});

// POST /api/me/updates/:id/read — opened, so it stops counting as new.
updatesRouter.post("/:id/read", authMiddleware, async (req: AuthenticatedRequest, res) => {
	try {
		const uid = req.user!.uid;
		const id = Number(req.params.id);
		if (!Number.isInteger(id) || id <= 0) { res.status(400).json({ error: "id must be an update id" }); return; }
		await pgQuery(
			`insert into update_reads (uid, update_id) values ($1, $2) on conflict (uid, update_id) do nothing`,
			[uid, id],
		);
		res.json({ ok: true });
	} catch (error) {
		console.error("Error marking update read:", error);
		res.status(500).json({ error: "Failed to mark update read" });
	}
});
