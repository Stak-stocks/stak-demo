// test cloud build auto-deploy
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import rateLimit from "express-rate-limit";
import path from "path";
import { fileURLToPath } from "url";
import cron from "node-cron";
import { brandsRouter } from "./routes/brands.js";
import { swipeRouter } from "./routes/swipe.js";
import { meRouter } from "./routes/me.js";
import { newsRouter } from "./routes/news.js";
import { stockRouter } from "./routes/stock.js";
import { intelCardsRouter } from "./routes/intelCards.js";
import { stocksRouter, deleteUnverifiedAccounts } from "./routes/ipos.js";
import { analyticsRouter } from "./routes/analytics.js";
import { recommendationsRouter } from "./routes/recommendations.js";
import { dailyBriefRouter } from "./routes/dailyBrief.js";
import { playgroundRouter } from "./routes/playground.js";
import { brandAdminRouter } from "./routes/brandAdmin.js";
import { authMigrationRouter } from "./routes/authMigration.js";
import { syncNewIPOs } from "./services/ipoService.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

const allowedOrigins = [
	"http://localhost:3000",
	"http://localhost:3001",
	"http://localhost:3002",
	"http://localhost:3003",
	"https://stak-demo.vercel.app",
	"https://thestak.org",
	"https://www.thestak.org",
];

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Allow all Vercel preview deploy URLs (e.g. stak-demo-git-feat-xyz-team.vercel.app)
const vercelPreviewPattern = /^https:\/\/stak-demo(-[a-z0-9-]+)?\.vercel\.app$/;

app.set("trust proxy", 1); // Trust GCP Cloud Run load balancer — enables real client IP for rate limiting
app.use(cors({
	origin: (origin, callback) => {
		if (!origin || allowedOrigins.includes(origin) || vercelPreviewPattern.test(origin)) {
			callback(null, true);
		} else {
			callback(new Error("Not allowed by CORS"));
		}
	},
}));
app.use(express.json({ limit: "1mb" }));
app.use(express.static(path.join(__dirname, "../public")));

// Rate limiters
const publicLimiter = rateLimit({
	windowMs: 60 * 1000,       // 1 minute
	max: 120,                  // 120 req/min per IP — allows batch stock loads (my-stak loads one per portfolio brand)
	standardHeaders: true,
	legacyHeaders: false,
	message: { error: "Too many requests, please try again later." },
});

const authLimiter = rateLimit({
	windowMs: 60 * 1000,       // 1 minute
	max: 120,                  // 120 req/min per IP for authenticated endpoints
	standardHeaders: true,
	legacyHeaders: false,
	message: { error: "Too many requests, please try again later." },
});

// Routes
app.use("/api/brands", publicLimiter, brandsRouter);
app.use("/api/swipe", authLimiter, swipeRouter);
app.use("/api/me", authLimiter, meRouter);
app.use("/api/news", publicLimiter, newsRouter);
app.use("/api/stock", publicLimiter, stockRouter);
app.use("/api/intel-cards", publicLimiter, intelCardsRouter);
app.use("/api/stocks", publicLimiter, stocksRouter);
app.use("/api/auth", publicLimiter, authMigrationRouter);
app.use("/api/admin/analytics", publicLimiter, analyticsRouter);
// No outer limiter here -- brandAdminRouter applies its own secret check
// before its own (much stricter) rate limit, see routes/brandAdmin.ts.
app.use("/api/admin/brands", brandAdminRouter);
app.use("/api/recommendations", authLimiter, recommendationsRouter);
app.use("/api/daily-brief", authLimiter, dailyBriefRouter);
app.use("/api/playground", authLimiter, playgroundRouter);

// Convenience redirect: /analytics → /analytics.html
app.get("/analytics", (_req, res) => res.redirect("/analytics.html"));

// Health check -- verifies database connectivity, not just process liveness.
// Use this after every deploy to confirm the service can actually reach Postgres
// before promoting traffic or declaring the deploy successful.
app.get("/api/health", async (_req, res) => {
	try {
		const { pgQuery } = await import("./lib/postgres.js");
		await pgQuery("select 1");
		res.json({ status: "ok", db: "connected" });
	} catch (err) {
		const message = err instanceof Error ? err.message : String(err);
		res.status(503).json({ status: "error", db: "unreachable", detail: message });
	}
});

app.listen(PORT, () => {
	console.log(`Backend running on port ${PORT}`);

	// Run IPO sync every 2 days at 2 AM UTC
	cron.schedule("0 2 */2 * *", async () => {
		console.log("[IPO Sync] Running scheduled sync...");
		try {
			const result = await syncNewIPOs();
			console.log("[IPO Sync] Complete:", result);
		} catch (e) {
			console.error("[IPO Sync] Failed:", e);
		}
	});
	console.log("[IPO Sync] Cron scheduled — runs every 2 days at 2 AM UTC");

	// Delete unverified email/password accounts older than 24h — runs every hour
	cron.schedule("0 * * * *", async () => {
		console.log("[Cleanup] Deleting unverified accounts...");
		try {
			const result = await deleteUnverifiedAccounts();
			if (result.deleted > 0 || result.errors > 0) {
				console.log(`[Cleanup] Done: deleted=${result.deleted}, errors=${result.errors}`);
			}
		} catch (e) {
			console.error("[Cleanup] Failed:", e);
		}
	});
	console.log("[Cleanup] Cron scheduled — runs every hour");
});
