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
      select: { id: true, name: true, whatsapp_access_token: true, whatsapp_phone_number_id: true, whatsappDisplayPhoneNumber: true }
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
        // Look up any approved price update template from DB
        let priceTemplate = await prisma.whatsAppTemplate.findFirst({
          where: {
            gymId: gym.id,
            status: "APPROVED",
            OR: [
              { templateName: { contains: "price", mode: "insensitive" } },
              { templateName: { contains: "plan_update", mode: "insensitive" } }
            ]
          },
          orderBy: { createdAt: "desc" }
        });

        if (!priceTemplate) {
          console.warn("⚠️ [Plans PUT] Blocked price update: No approved price_change template found in DB.");
          return res.status(400).json({
            error: "Cannot update plan price: Approved 'price_change' template is missing. Please create or import the price_change template from Template Library first."
          });
        }

        try {
          const accessToken = decrypt(gym.whatsapp_access_token);
          const GRAPH_BASE_URL = process.env.META_GRAPH_BASE_URL || "https://graph.facebook.com";
          const META_API_VERSION = process.env.META_API_VERSION || "v20.0";

          const templateName = priceTemplate.templateName;
          const templateLang = priceTemplate.language || "en_US";
          
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
                    name: templateName,
                    language: { code: templateLang },
                    components: [
                      {
                        type: "body",
                        parameters: [
                          { type: "text", text: membership.member.memberName || 'Member' },
                          { type: "text", text: updatedPlan.name },
                          { type: "text", text: `₹${newPrice}` }
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
            let errorMessage = null;
            let contentToSave = `Hello ${membership.member.memberName || 'Member'}, This is an important update! The price of your current subscription plan ${updatedPlan.name} has been updated to ₹${newPrice}. If you have any questions, feel free to contact us.`;

            if (templateResponse.ok && templateData.messages?.[0]?.id) {
               messageId = templateData.messages[0].id;
            } else {
               status = "FAILED";
               errorMessage = templateData.error?.message || JSON.stringify(templateData.error || templateData);
               console.error("❌ Meta Template sending failed:", templateData);
            }

            // Save message to DB
            const savedMessage = await prisma.whatsAppMessage.create({
              data: {
                gymId: gym.id,
                messageId,
                senderPhone: gym.whatsappDisplayPhoneNumber || gym.whatsapp_phone_number_id || "system",
                recipientPhone: membership.member.phone,
                text: contentToSave,
                direction: "OUTBOUND",
                status,
                errorMessage
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
                errorMessage: savedMessage.errorMessage || undefined,
                createdAt: savedMessage.createdAt
              };
              const io = getIO();
              io.to(`conversation:${membership.member.id}`).emit("message:new", mappedMsg);
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

