import { Router } from "express";
import prisma from "../prisma.js";

const router = Router({ mergeParams: true });

/**
 * =====================================
 * GET ALL TRANSACTIONS
 * =====================================
 */
router.get("/", async (req, res) => {
  const { gymSlug } = req.params;

  try {
    const gym = await prisma.gym.findUnique({
      where: { slug: gymSlug.toLowerCase() },
      select: { id: true }
    });

    if (!gym) {
      return res.status(404).json({ error: "Gym not found" });
    }

    const transactions = await prisma.transaction.findMany({
      where: { gymId: gym.id },
      include: {
        member: {
          select: {
            name: true,
            phone: true
          }
        },
        plan: {
          select: {
            name: true,
            durationDays: true
          }
        },
        invoice: {
          select: {
            invoiceNumber: true
          }
        }
      },
      orderBy: { createdAt: "desc" }
    });

    res.json({ transactions });
  } catch (err) {
    console.error("❌ [Payments GET] Error:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

/**
 * =====================================
 * PROCESS PAYMENT ACTION (APPROVE / REJECT)
 * =====================================
 */
router.post("/", async (req, res) => {
  const { gymSlug } = req.params;
  const { transactionId, action, reason } = req.body;

  if (!transactionId || !action) {
    return res.status(400).json({ error: "transactionId and action are required" });
  }

  try {
    const gym = await prisma.gym.findUnique({
      where: { slug: gymSlug.toLowerCase() },
      select: { id: true }
    });

    if (!gym) {
      return res.status(404).json({ error: "Gym not found" });
    }

    const transaction = await prisma.transaction.findUnique({
      where: { id: transactionId },
      include: { plan: true }
    });

    if (!transaction) {
      return res.status(404).json({ error: "Transaction not found" });
    }

    if (action === "APPROVE") {
      // 1. Update transaction status
      const updatedTxn = await prisma.transaction.update({
        where: { id: transactionId },
        data: { status: "PAID" }
      });

      // 2. Create active membership
      const startDate = new Date();
      const endDate = new Date();
      endDate.setDate(startDate.getDate() + transaction.plan.durationDays);

      await prisma.membership.create({
        data: {
          memberId: transaction.memberId,
          planId: transaction.planId,
          startDate,
          endDate,
          status: "ACTIVE",
          gymId: gym.id
        }
      });

      // 3. Create invoice
      const invoiceNumber = `INV-${Date.now()}`;
      await prisma.invoice.create({
        data: {
          invoiceNumber,
          dueDate: endDate,
          amount: transaction.amount,
          totalAmount: transaction.amount,
          transactionId: transaction.id,
          gymId: gym.id
        }
      });

      // 4. Create Audit Log
      await prisma.auditLog.create({
        data: {
          action: "PAYMENT_APPROVE",
          details: `Approved transaction ${transactionId} for amount ₹${transaction.amount}. Active membership created.`,
          gymId: gym.id,
          userId: req.user?.userId || null
        }
      });

      return res.json({ success: true, transaction: updatedTxn });
    } else if (action === "REJECT") {
      const updatedTxn = await prisma.transaction.update({
        where: { id: transactionId },
        data: { 
          status: "REJECTED",
          paymentDetails: reason ? { rejectReason: reason } : undefined
        }
      });

      // Create Audit Log
      await prisma.auditLog.create({
        data: {
          action: "PAYMENT_REJECT",
          details: `Rejected transaction ${transactionId}. Reason: ${reason || "No reason given"}`,
          gymId: gym.id,
          userId: req.user?.userId || null
        }
      });

      return res.json({ success: true, transaction: updatedTxn });
    } else {
      return res.status(400).json({ error: "Invalid action. Use APPROVE or REJECT." });
    }
  } catch (err) {
    console.error("❌ [Payments POST] Error:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

export default router;
