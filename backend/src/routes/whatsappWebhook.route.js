import { Router } from "express";
import prisma from "../prisma.js";
import { getIO } from "../socket.js";

const router = Router();

// Configuration token from environment
const VERIFY_TOKEN = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN;

/**
 * =====================================
 * WEBHOOK VERIFICATION (META GET)
 * =====================================
 */
router.get("/", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  console.log("🔍 Webhook Verification Attempt:", { mode, token });

  if (mode === "subscribe" && token === VERIFY_TOKEN) {
    console.log("✅ Webhook verified successfully");
    return res.status(200).send(challenge);
  }

  console.error("❌ Webhook verification failed. Token mismatch.");
  return res.sendStatus(403);
});

/**
 * =====================================
 * WEBHOOK EVENT RECEIVER (META POST)
 * =====================================
 */
router.post("/", async (req, res) => {
  const body = req.body;

  // Let Meta know we received the event immediately to avoid retries
  res.sendStatus(200);

  try {
    const entry = body.entry?.[0];
    const change = entry?.changes?.[0];
    const value = change?.value;

    if (!value) return;

    // Resolve matching Gym tenant by Meta Phone Number ID
    const phoneNumberId = value.metadata?.phone_number_id;
    if (!phoneNumberId) return;

    const gym = await prisma.gym.findFirst({
      where: { whatsapp_phone_number_id: phoneNumberId },
    });

    if (!gym) {
      console.warn(`⚠️ Received WhatsApp webhook for unregistered Phone ID: ${phoneNumberId}`);
      return;
    }

    /* =====================================================
       1. CUSTOMER MESSAGES (INBOUND)
       ===================================================== */
    if (value.messages?.length) {
      for (const msg of value.messages) {
        const messageId = msg.id;
        const senderPhone = msg.from;
        const recipientPhone = value.metadata.display_phone_number || "";

        // Extract message body text
        let text = "";
        if (msg.type === "text") {
          text = msg.text?.body || "";
        } else if (msg.type === "interactive") {
          const interactive = msg.interactive;
          text = interactive?.button_reply?.title || interactive?.list_reply?.title || "[interactive]";
        } else if (msg.type === "button") {
          text = msg.button?.text || "";
        } else {
          text = `[${msg.type} message]`;
        }

        // Check for duplicate messages (idempotency check)
        const exists = await prisma.whatsAppMessage.findUnique({
          where: { messageId },
        });

        if (!exists) {
          // Log message to database
          const incomingMessage = await prisma.whatsAppMessage.create({
            data: {
              gymId: gym.id,
              messageId,
              senderPhone,
              recipientPhone,
              text,
              direction: "INBOUND",
              status: "RECEIVED",
            },
          });

          // Trigger WebSocket realtime update (if active)
          try {
            const io = getIO();
            io.to(`gym:${gym.id}`).emit("whatsapp:message", incomingMessage);
          } catch (wsErr) {
            console.error("Failed to emit WhatsApp WebSocket event:", wsErr.message);
          }
        }
      }
    }

    /* =====================================================
       2. STATUS UPDATES (OUTBOUND DELIVERIES)
       ===================================================== */
    if (value.statuses?.length) {
      for (const statusObj of value.statuses) {
        const messageId = statusObj.id;
        const metaState = statusObj.status; // sent | delivered | read | failed
        const errorCode = statusObj.errors?.[0]?.code;
        const errorMessage = statusObj.errors?.[0]?.message || null;

        // Try to update existing database message status
        const message = await prisma.whatsAppMessage.findUnique({
          where: { messageId },
        });

        if (message) {
          await prisma.whatsAppMessage.update({
            where: { messageId },
            data: {
              status: metaState.toUpperCase(),
              errorMessage: errorMessage || null,
            },
          });
        }

        // Always log raw event for auditing
        await prisma.whatsAppEvent.create({
          data: {
            messageId,
            eventType: metaState.toUpperCase(),
            timestamp: new Date(Number(statusObj.timestamp) * 1000),
            rawPayload: statusObj,
          },
        });

        // Trigger WebSocket updates for status changes
        if (message) {
          try {
            const io = getIO();
            io.to(`gym:${gym.id}`).emit("whatsapp:status", {
              messageId,
              status: metaState.toUpperCase(),
              errorCode,
              errorMessage,
            });
          } catch (wsErr) {}
        }
      }
    }
  } catch (err) {
    console.error("❌ Error processing WhatsApp webhook payload:", err);
  }
});

export default router;
