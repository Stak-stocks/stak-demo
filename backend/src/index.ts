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
import { trendsRouter } from "./routes/trends.js";
import { stockRouter } from "./routes/stock.js";
import { intelCardsRouter } from "./routes/intelCards.js";
import { iposRouter, deleteUnverifiedAccounts } from "./routes/ipos.js";
import { vibesRouter } from "./routes/vibes.js";
import { analyticsRouter } from "./routes/analytics.js";
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

app.set("trust proxy", 1); // Trust GCP Cloud Run load balancer — enables real client IP for rate limiting
app.use(cors({ origin: allowedOrigins }));
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
app.use("/api/trends", publicLimiter, trendsRouter);
app.use("/api/stock", publicLimiter, stockRouter);
app.use("/api/intel-cards", publicLimiter, intelCardsRouter);
app.use("/api/stocks", publicLimiter, iposRouter);
app.use("/api/vibes", publicLimiter, vibesRouter);
app.use("/api/admin/analytics", publicLimiter, analyticsRouter);

// Convenience redirect: /analytics → /analytics.html
app.get("/analytics", (_req, res) => res.redirect("/analytics.html"));

// Health check
app.get("/api/health", (_req, res) => {
	res.json({ status: "ok" });
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
