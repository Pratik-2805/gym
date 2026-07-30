import { Router } from "express";
import prisma from "../prisma.js";

const router = Router({ mergeParams: true });

/**
 * =====================================
 * GET CHATBOT SETTINGS
 * =====================================
 */
router.get("/", async (req, res) => {
  const gymSlug = req.gym.slug;

  try {
    const gym = await prisma.gym.findUnique({
      where: { slug: gymSlug.toLowerCase() },
      include: { chatbotSettings: true }
    });

    if (!gym) {
      return res.status(404).json({ error: "Gym not found" });
    }

    // Return the settings wrapper format expected by the frontend
    res.json({ chatbotSettings: gym.chatbotSettings });
  } catch (err) {
    console.error("❌ [Chatbot GET] Error:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

/**
 * =====================================
 * SAVE/UPSERT CHATBOT SETTINGS
 * =====================================
 */
router.post("/", async (req, res) => {
  const gymSlug = req.gym.slug;
  const { welcomeMessage, isAiModeEnabled, aiKnowledgeBase } = req.body;

  try {
    const gym = await prisma.gym.findUnique({
      where: { slug: gymSlug.toLowerCase() },
    });

    if (!gym) {
      return res.status(404).json({ error: "Gym not found" });
    }

    const settings = await prisma.chatbotSettings.upsert({
      where: { gymId: gym.id },
      create: {
        gymId: gym.id,
        welcomeMessage: welcomeMessage || "Welcome!",
        isAiModeEnabled: !!isAiModeEnabled,
        aiKnowledgeBase: aiKnowledgeBase || null,
      },
      update: {
        welcomeMessage: welcomeMessage !== undefined ? welcomeMessage : undefined,
        isAiModeEnabled: isAiModeEnabled !== undefined ? !!isAiModeEnabled : undefined,
        aiKnowledgeBase: aiKnowledgeBase !== undefined ? aiKnowledgeBase : undefined,
      }
    });

    res.json({ success: true, chatbotSettings: settings });
  } catch (err) {
    console.error("❌ [Chatbot POST] Error:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

export default router;
