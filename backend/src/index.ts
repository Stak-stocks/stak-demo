import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { brandsRouter } from "./routes/brands.js";
import { swipeRouter } from "./routes/swipe.js";
import { meRouter } from "./routes/me.js";
import { newsRouter } from "./routes/news.js";
import { trendsRouter } from "./routes/trends.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

const allowedOrigins = [
	"http://localhost:3000",
	"https://stak-demo.vercel.app",
];

app.use(cors({ origin: allowedOrigins }));
app.use(express.json());

// Routes
app.use("/api/brands", brandsRouter);
app.use("/api/swipe", swipeRouter);
app.use("/api/me", meRouter);
app.use("/api/news", newsRouter);
app.use("/api/trends", trendsRouter);

// Health check
app.get("/api/health", (_req, res) => {
	res.json({ status: "ok" });
});

app.listen(PORT, () => {
	console.log(`Backend running on port ${PORT}`);
});
