import prisma from '../src/prisma.js';

async function main() {
  const plans = await prisma.membershipPlan.findMany({
    include: {
      memberships: {
        include: {
          member: true
        }
      }
    }
  });
  console.log("PLANS IN DB:", JSON.stringify(plans, null, 2));

  const members = await prisma.member.findMany({
    include: {
      memberships: {
        include: {
          plan: true
        }
      }
    }
  });
  console.log("MEMBERS IN DB:", JSON.stringify(members, null, 2));

  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
