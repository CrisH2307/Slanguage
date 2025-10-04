import "dotenv/config";
import express from "express";
import cors from "cors";
import translateRoute from "./routes/translate.js";

const app = express();
app.use(express.json());

app.use(
  cors({
    origin: process.env.ALLOW_ORIGIN?.split(",") || "*",
  })
);

app.get("/api/health", (_, res) => res.json({ ok: true }));
app.use("/api/translate", translateRoute);

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`API on http://localhost:${PORT}`));
