import express from "express";
import { Readable } from "stream";
import prisma from "../prisma.js";
import { decrypt } from "../utils/encryption.js";

const router = express.Router({ mergeParams: true });
const GRAPH_BASE_URL = "https://graph.facebook.com";
const META_API_VERSION = process.env.META_API_VERSION || "v19.0";

// GET /api/media/:mediaId OR /api/media/:gymSlug/:mediaId
router.get("/:param1/:param2?", async (req, res) => {
  const mediaId = req.params.param2 || req.params.param1;
  const gymSlug = req.params.param2 ? req.params.param1 : (req.gym?.slug || req.query.gymSlug);

  try {
    // 🛡️ Strict Tenant Isolation (Prevent Cross-Tenant Media IDOR)
    if (req.user && req.user.role !== "SUPERADMIN" && req.gym) {
      if (gymSlug && gymSlug.toLowerCase() !== req.gym.slug.toLowerCase()) {
        console.warn(`🚨 [Security Alert] Blocked cross-tenant media access attempt by User ${req.user.id} for Gym ${gymSlug}`);
        return res.status(403).json({ error: "Forbidden: Cross-tenant media access not allowed" });
      }
    }

    let gym = req.gym;
    if (!gym && gymSlug) {
      gym = await prisma.gym.findUnique({
        where: { slug: gymSlug.toLowerCase() },
      });
    }

    if (!gym) {
      gym = await prisma.gym.findFirst({
        where: {
          whatsapp_access_token: { not: null },
        },
      });
    }

    if (!gym || !gym.whatsapp_access_token) {
      return res.status(404).json({ error: "Gym or WhatsApp configuration not found" });
    }

    const token = decrypt(gym.whatsapp_access_token);

    // 1. Fetch the media URL from Meta
    const mediaRes = await fetch(`${GRAPH_BASE_URL}/${META_API_VERSION}/${mediaId}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const mediaData = await mediaRes.json();

    if (!mediaRes.ok || !mediaData.url) {
      console.error("❌ [Media Proxy] Failed to fetch media URL:", mediaData);
      return res.status(400).json({ error: "Failed to fetch media details from Meta" });
    }

    // 2. Fetch the actual media binary from Meta
    const downloadRes = await fetch(mediaData.url, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!downloadRes.ok) {
      console.error("❌ [Media Proxy] Failed to download media from Meta");
      return res.status(500).json({ error: "Failed to download media" });
    }

    // 3. Buffer and send the media binary with headers
    const contentType = downloadRes.headers.get("content-type");
    const arrayBuffer = await downloadRes.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    if (contentType) res.setHeader("Content-Type", contentType);
    res.setHeader("Content-Length", buffer.length);
    res.setHeader("Cache-Control", "public, max-age=31536000, immutable");

    return res.send(buffer);
  } catch (err) {
    console.error("❌ [Media Proxy] Internal Error:", err.message);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

export default router;
