import "dotenv/config";
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import http from "http";
import prisma from "./prisma.js";
import { initSocket } from "./socket.js";
import authRouter from "./routes/auth.js";
import usersRouter from "./routes/users.js";
import whatsappRouter from "./routes/whatsapp.route.js";
import whatsappWebhookRouter from "./routes/whatsappWebhook.route.js";
import whatsappTemplatesRouter from "./routes/whatsappTemplates.route.js";
import inboxRouter from "./routes/inbox.route.js";
import membersRouter from "./routes/members.route.js";
import plansRouter from "./routes/plans.route.js";
import { authenticateToken, scopeToGym } from "./middleware/auth.js";
import { decrypt } from "./utils/encryption.js";


const app = express();
app.set("trust proxy", 1);

/* ================= MIDDLEWARE ================= */
app.use(express.json());
app.use(cookieParser());

const allowedOrigins = process.env.FRONTEND_URL
  ? process.env.FRONTEND_URL.split(",").map((o) => o.trim())
  : ["http://localhost:3000"];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, postman, webhooks)
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        console.warn(`🔒 CORS Blocked: Request origin "${origin}" is not allowed. Allowed:`, allowedOrigins);
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
  })
);

app.set("etag", false);

/* ================= ROUTES ================= */
app.get("/ping", (req, res) => res.send("pong"));

app.get("/health", (req, res) => {
  res.json({ status: "OK", timestamp: new Date() });
});

app.use("/api/auth", authRouter);
app.use("/api/users", usersRouter);

/**
 * =====================================
 * PUBLIC MEDIA PROXY (GET /api/media/:gymSlug/:mediaId)
 * =====================================
 * Streams WhatsApp media files on-the-fly from Meta Graph API.
 * Registered as a public route so browser img/audio tags can load them directly without Bearer tokens.
 */
app.get("/api/media/:gymSlug/:mediaId", async (req, res) => {
  const { gymSlug, mediaId } = req.params;

  try {
    const gym = await prisma.gym.findUnique({
      where: { slug: gymSlug.toLowerCase() }
    });

    if (!gym || !gym.whatsapp_access_token) {
      return res.status(400).json({ error: "WhatsApp integration is not configured." });
    }

    const accessToken = decrypt(gym.whatsapp_access_token);
    const base = process.env.META_GRAPH_BASE_URL || "https://graph.facebook.com";
    const version = process.env.META_API_VERSION || "v20.0";

    // 1. Fetch media metadata from Meta to get the signed URL
    const metaRes = await fetch(`${base}/${version}/${mediaId}`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!metaRes.ok) {
      const errorData = await metaRes.json().catch(() => ({}));
      console.error("Meta media metadata fetch failed:", errorData);
      return res.status(metaRes.status).json({ error: "Failed to fetch media metadata from Meta" });
    }

    const meta = await metaRes.json();

    if (!meta.url || !meta.mime_type) {
      return res.status(400).json({ error: "Invalid media metadata returned from Meta" });
    }

    // 2. Fetch the file content from Meta's URL
    const fileRes = await fetch(meta.url, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!fileRes.ok) {
      return res.status(fileRes.status).json({ error: "Failed to download media content from Meta" });
    }

    // 3. Pipe the media file back to the browser
    res.setHeader("Content-Type", meta.mime_type);
    res.setHeader("Cache-Control", "public, max-age=86400"); // 1 day browser caching

    const arrayBuffer = await fileRes.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    res.send(buffer);
  } catch (err) {
    console.error("❌ [Public Media Proxy] Error:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.use("/api/dashboard/:gymSlug/whatsapp/templates", authenticateToken, scopeToGym, whatsappTemplatesRouter);
app.use("/api/dashboard/:gymSlug/whatsapp", authenticateToken, scopeToGym, whatsappRouter);
app.use("/api/dashboard/:gymSlug/inbox", authenticateToken, scopeToGym, inboxRouter);
app.use("/api/dashboard/:gymSlug/members", authenticateToken, scopeToGym, membersRouter);
app.use("/api/dashboard/:gymSlug/plans", authenticateToken, scopeToGym, plansRouter);
app.use("/uploads", express.static("uploads"));
app.use("/webhook", whatsappWebhookRouter);



/* ================= ERROR HANDLING ================= */
app.use((err, req, res, next) => {
  if (err) {
    console.error("❌ Global Error:", err);
    return res.status(500).json({
      message: "Internal Server Error",
      error: err.message || "Unknown error occurred",
    });
  }
  next();
});

/* ================= SERVER START ================= */
const PORT = process.env.PORT || 5000;

async function startServer() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    console.log("✅ Database connected successfully");
  } catch (error) {
    console.error("❌ Database connection failed");
    console.error(error);
  }

  const server = http.createServer(app);
  initSocket(server);

  server.listen(PORT, "0.0.0.0", () => {
    console.log(`🚀 Gym Backend + WebSocket running on port ${PORT}`);
  });
}

startServer();
