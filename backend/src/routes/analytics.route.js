import { Router } from "express";
import prisma from "../prisma.js";

const router = Router({ mergeParams: true });

/**
 * =====================================
 * GET SYSTEM ANALYTICS & TRENDS
 * =====================================
 */
router.get("/", async (req, res) => {
  const { gymSlug } = req.params;

  try {
    // 1. Fetch the gym matching the slug
    const gym = await prisma.gym.findUnique({
      where: { slug: gymSlug.toLowerCase() },
      select: { id: true }
    });

    if (!gym) {
      return res.status(404).json({ error: "Gym not found" });
    }

    // 2. Fetch all members with their memberships and plans
    const members = await prisma.member.findMany({
      where: { gymId: gym.id },
      include: {
        memberships: {
          include: {
            plan: {
              select: {
                name: true
              }
            }
          }
        }
      },
      orderBy: { createdAt: "desc" }
    });

    // 3. Compute Member Plan Statuses
    let activeMembersCount = 0;
    let expiredMembersCount = 0;
    let noPlanMembersCount = 0;

    const mappedMembers = members.map(m => {
      const hasActive = m.memberships.some(ms => ms.status === "ACTIVE");
      const hasAny = m.memberships.length > 0;
      
      let status = "NONE";
      let activePlanName = null;

      if (hasActive) {
        status = "ACTIVE";
        activeMembersCount++;
        activePlanName = m.memberships.find(ms => ms.status === "ACTIVE")?.plan?.name || "Active Plan";
      } else if (hasAny) {
        status = "EXPIRED";
        expiredMembersCount++;
      } else {
        status = "NONE";
        noPlanMembersCount++;
      }

      return {
        id: m.id,
        name: m.memberName || m.whatsappName || "Unnamed Member",
        phone: m.phone,
        email: m.email || "N/A",
        createdAt: m.createdAt,
        status,
        activePlanName
      };
    });

    const totalMembersCount = members.length;
    const conversionRate = totalMembersCount > 0 
      ? Math.round(((activeMembersCount + expiredMembersCount) / totalMembersCount) * 100) 
      : 0;

    // 4. Calculate Revenue
    const totalRevenueAggregate = await prisma.transaction.aggregate({
      where: {
        gymId: gym.id,
        status: "PAID"
      },
      _sum: {
        amount: true
      }
    });
    const totalRevenue = totalRevenueAggregate._sum.amount || 0;

    // 5. Monthly Trends (Last 6 Months)
    const trends = [];
    const now = new Date();

    // Query helper for trends
    const registrationDates = await prisma.member.findMany({
      where: { gymId: gym.id },
      select: { createdAt: true }
    });

    const revenueTransactions = await prisma.transaction.findMany({
      where: { gymId: gym.id, status: "PAID" },
      select: { createdAt: true, amount: true }
    });

    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthName = d.toLocaleString("default", { month: "short" }) + " " + d.getFullYear().toString().slice(-2);
      
      const startOfMonth = new Date(d.getFullYear(), d.getMonth(), 1);
      const endOfMonth = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);

      // Registrations in this month
      const regCount = registrationDates.filter(
        r => r.createdAt >= startOfMonth && r.createdAt <= endOfMonth
      ).length;

      // Revenue in this month
      const revSum = revenueTransactions
        .filter(t => t.createdAt >= startOfMonth && t.createdAt <= endOfMonth)
        .reduce((sum, tx) => sum + tx.amount, 0);

      trends.push({
        name: monthName,
        revenue: Math.round(revSum),
        members: regCount
      });
    }

    // 6. Plan Popularity
    const plans = await prisma.membershipPlan.findMany({
      where: { gymId: gym.id },
      include: {
        memberships: {
          select: { id: true, status: true }
        },
        transactions: {
          where: { status: "PAID" },
          select: { amount: true }
        }
      }
    });

    const planDistribution = plans.map(p => {
      const totalSubscribers = p.memberships.length;
      const activeSubscribers = p.memberships.filter(m => m.status === "ACTIVE").length;
      const planRevenue = p.transactions.reduce((sum, tx) => sum + tx.amount, 0);

      return {
        id: p.id,
        name: p.name,
        price: p.price,
        durationDays: p.durationDays,
        totalSubscribers,
        activeSubscribers,
        revenue: planRevenue
      };
    }).sort((a, b) => b.activeSubscribers - a.activeSubscribers);

    // 7. Payment Modes Distribution
    const paymentsGroup = await prisma.transaction.groupBy({
      by: ["paymentMode"],
      where: {
        gymId: gym.id,
        status: "PAID"
      },
      _count: {
        id: true
      },
      _sum: {
        amount: true
      }
    });

    const paymentDistribution = paymentsGroup.map(pg => ({
      mode: pg.paymentMode,
      count: pg._count.id,
      revenue: pg._sum.amount || 0
    }));

    // Return payload
    res.json({
      summary: {
        totalMembers: totalMembersCount,
        activeMembers: activeMembersCount,
        expiredMembers: expiredMembersCount,
        noPlanMembers: noPlanMembersCount,
        conversionRate,
        totalRevenue
      },
      trends,
      planDistribution,
      paymentDistribution,
      membersList: mappedMembers
    });

  } catch (err) {
    console.error("❌ [Analytics GET] Error:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

export default router;
