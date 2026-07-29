import { Router } from "express";
import prisma from "../prisma.js";
import { decrypt } from "../utils/encryption.js";
import { getIO } from "../socket.js";

const router = Router({ mergeParams: true });

/**
 * =====================================
 * GET ALL PLANS
 * =====================================
 */
router.get("/", async (req, res) => {
  const gymSlug = req.gym.slug;

  try {
    const gym = await prisma.gym.findUnique({
      where: { slug: gymSlug.toLowerCase() },
      select: { id: true }
    });

    if (!gym) {
      return res.status(404).json({ error: "Gym not found" });
    }

    const plans = await prisma.membershipPlan.findMany({
      where: { gymId: gym.id },
      include: {
        memberships: {
          include: {
            member: {
              select: {
                id: true,
                memberName: true,
                phone: true
              }
            }
          }
        }
      },
      orderBy: { price: "asc" }
    });

    // Map memberName to name for frontend compatibility in plans
    const mappedPlans = plans.map(p => ({
      ...p,
      memberships: p.memberships.map(m => ({
        ...m,
        member: {
          ...m.member,
          name: m.member.memberName || ''
        }
      }))
    }));


    res.json({ plans: mappedPlans });
  } catch (err) {
    console.error("❌ [Plans GET] Error:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

/**
 * =====================================
 * CREATE A PLAN
 * =====================================
 */
router.post("/", async (req, res) => {
  const gymSlug = req.gym.slug;
  const { name, description, price, durationDays } = req.body;

  if (!name || price === undefined || !durationDays) {
    return res.status(400).json({ error: "Name, price, and duration are required" });
  }

  try {
    const gym = await prisma.gym.findUnique({
      where: { slug: gymSlug.toLowerCase() },
      select: { id: true }
    });

    if (!gym) {
      return res.status(404).json({ error: "Gym not found" });
    }

    const newPlan = await prisma.membershipPlan.create({
      data: {
        gymId: gym.id,
        name,
        description: description || null,
        price: parseFloat(price),
        durationDays: parseInt(durationDays),
      }
    });

    res.status(201).json({ success: true, plan: newPlan });
  } catch (err) {
    console.error("❌ [Plans POST] Error:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

/**
 * =====================================
 * UPDATE A PLAN
 * =====================================
 */
router.put("/:planId", async (req, res) => {
  const gymSlug = req.gym.slug;
  const { planId } = req.params;
  const { name, description, price, durationDays } = req.body;

  if (!name || price === undefined || !durationDays) {
    return res.status(400).json({ error: "Name, price, and duration are required" });
  }

  try {
    const gym = await prisma.gym.findUnique({
      where: { slug: gymSlug.toLowerCase() },
      select: { id: true, name: true, whatsapp_access_token: true, whatsapp_phone_number_id: true }
    });

    if (!gym) {
      return res.status(404).json({ error: "Gym not found" });
    }

    const plan = await prisma.membershipPlan.findFirst({
      where: { id: planId, gymId: gym.id }
    });

    if (!plan) {
      return res.status(404).json({ error: "Plan not found for this gym" });
    }

    const newPrice = parseFloat(price);
    const oldPrice = plan.price;

    const updatedPlan = await prisma.membershipPlan.update({
      where: { id: planId },
      data: {
        name,
        description: description || null,
        price: newPrice,
        durationDays: parseInt(durationDays),
      }
    });

    if (newPrice !== oldPrice && gym.whatsapp_access_token && gym.whatsapp_phone_number_id) {
      const activeMemberships = await prisma.membership.findMany({
        where: { planId, status: "ACTIVE" },
        include: { member: true }
      });

      if (activeMemberships.length > 0) {
        try {
          const accessToken = decrypt(gym.whatsapp_access_token);
          const GRAPH_BASE_URL = process.env.META_GRAPH_BASE_URL || "https://graph.facebook.com";
          const META_API_VERSION = process.env.META_API_VERSION || "v20.0";
          
          for (const membership of activeMemberships) {
            if (!membership.member.phone || membership.member.blockedAt) continue;

            // Send template message for price update
            const templateResponse = await fetch(
              `${GRAPH_BASE_URL}/${META_API_VERSION}/${gym.whatsapp_phone_number_id}/messages`,
              {
                method: "POST",
                headers: {
                  Authorization: `Bearer ${accessToken}`,
                  "Content-Type": "application/json"
                },
                body: JSON.stringify({
                  messaging_product: "whatsapp",
                  recipient_type: "individual",
                  to: membership.member.phone,
                  type: "template",
                  template: {
                    name: "plan_price_update",
                    language: { code: "en_US" },
                    components: [
                      {
                        type: "body",
                        parameters: [
                          { type: "text", text: membership.member.memberName || 'Member' },
                          { type: "text", text: updatedPlan.name },
                          { type: "text", text: newPrice.toString() }
                        ]
                      }
                    ]
                  }
                })
              }
            );

            const templateData = await templateResponse.json();
            let messageId = `temp-${Date.now()}`;
            let status = "SENT";
            let contentToSave = `Hi ${membership.member.memberName || 'Member'}, this is an update regarding your gym membership. The price for the ${updatedPlan.name} plan has been updated to ₹${newPrice}. Please contact the front desk if you have any questions.`;

            if (templateResponse.ok && templateData.messages?.[0]?.id) {
               messageId = templateData.messages[0].id;
            } else {
               status = "FAILED";
               console.error("❌ Meta Template sending failed:", templateData);
            }

            // Save message to DB
            const savedMessage = await prisma.whatsAppMessage.create({
              data: {
                gymId: gym.id,
                messageId,
                senderPhone: gym.whatsapp_phone_number_id || "system", // Usually phone number, but we just use ID or system here since we don't have the explicit sender number in this query.
                recipientPhone: membership.member.phone,
                text: contentToSave,
                direction: "OUTBOUND",
                status
              }
            });

            // Emit socket updates
            try {
              const mappedMsg = {
                id: savedMessage.id,
                whatsappMessageId: savedMessage.messageId,
                content: savedMessage.text,
                direction: "outbound",
                status: status.toLowerCase(),
                createdAt: savedMessage.createdAt
              };
              const io = getIO();
              io.to(`conversation:${membership.member.id}`).emit("message:new", mappedMsg);
              io.to(`gym:${gym.id}`).emit("inbox:update");
            } catch (err) {
              console.error("⚠️ Socket emit failed on plans message:", err);
            }
          }
        } catch (err) {
          console.error("❌ [Plans PUT] Error sending notifications:", err);
        }
      }
    }

    res.json({ success: true, plan: updatedPlan });
  } catch (err) {
    console.error("❌ [Plans PUT] Error:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

/**
 * =====================================
 * DELETE A PLAN
 * =====================================
 */
router.delete("/:planId", async (req, res) => {
  const gymSlug = req.gym.slug;
  const { planId } = req.params;

  try {
    const gym = await prisma.gym.findUnique({
      where: { slug: gymSlug.toLowerCase() },
      select: { id: true }
    });

    if (!gym) {
      return res.status(404).json({ error: "Gym not found" });
    }

    const plan = await prisma.membershipPlan.findFirst({
      where: { id: planId, gymId: gym.id }
    });

    if (!plan) {
      return res.status(404).json({ error: "Plan not found for this gym" });
    }

    await prisma.membershipPlan.delete({
      where: { id: planId }
    });

    res.json({ success: true });
  } catch (err) {
    console.error("❌ [Plans DELETE] Error:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

export default router;

