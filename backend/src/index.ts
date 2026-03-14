import express from "express";
import cors from "cors";
import dotenv from "dotenv";
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

app.use(cors({ origin: allowedOrigins }));
app.use(express.json({ limit: "1mb" }));

// Routes
app.use("/api/brands", brandsRouter);
app.use("/api/swipe", swipeRouter);
app.use("/api/me", meRouter);
app.use("/api/news", newsRouter);
app.use("/api/trends", trendsRouter);
app.use("/api/stock", stockRouter);
app.use("/api/intel-cards", intelCardsRouter);
app.use("/api/stocks", iposRouter);
app.use("/api/vibes", vibesRouter);

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
