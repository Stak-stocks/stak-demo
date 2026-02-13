import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { brandsRouter } from "./routes/brands.js";
import { swipeRouter } from "./routes/swipe.js";
import { meRouter } from "./routes/me.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Routes
app.use("/api/brands", brandsRouter);
app.use("/api/swipe", swipeRouter);
app.use("/api/me", meRouter);

// Health check
app.get("/api/health", (_req, res) => {
	res.json({ status: "ok" });
});

app.listen(PORT, () => {
	console.log(`Backend running on http://localhost:${PORT}`);
});
