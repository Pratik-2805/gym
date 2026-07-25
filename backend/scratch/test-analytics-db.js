import prisma from "../src/prisma.js";

async function runTest() {
  try {
    console.log("🔍 Checking Database Connection...");
    const gyms = await prisma.gym.findMany();
    console.log(`✅ Connection OK. Found ${gyms.length} gyms.`);
    
    if (gyms.length === 0) {
      console.log("⚠️ No gyms found. Please register a gym first.");
      return;
    }

    const firstGym = gyms[0];
    console.log(`\n📊 Testing Analytics queries for Gym: "${firstGym.name}" (slug: "${firstGym.slug}")`);

    const totalMembers = await prisma.member.count({
      where: { gymId: firstGym.id }
    });
    console.log(`- Total members count: ${totalMembers}`);

    const members = await prisma.member.findMany({
      where: { gymId: firstGym.id },
      include: {
        memberships: {
          select: { status: true }
        }
      }
    });

    let active = 0;
    let expired = 0;
    let none = 0;

    for (const m of members) {
      if (m.memberships.some(ms => ms.status === "ACTIVE")) {
        active++;
      } else if (m.memberships.length > 0) {
        expired++;
      } else {
        none++;
      }
    }

    console.log(`- Active Plan Members: ${active}`);
    console.log(`- Expired Plan Members: ${expired}`);
    console.log(`- No Plan Members: ${none}`);

    const revenue = await prisma.transaction.aggregate({
      where: {
        gymId: firstGym.id,
        status: "PAID"
      },
      _sum: { amount: true }
    });
    console.log(`- Total Revenue: ₹${revenue._sum.amount || 0}`);

    console.log("\n✅ All test queries compiled successfully.");
  } catch (error) {
    console.error("❌ Test script failed:", error);
  } finally {
    await prisma.$disconnect();
  }
}

runTest();
