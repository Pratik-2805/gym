import prisma from './src/prisma.js';

async function main() {
  const templates = await prisma.whatsAppTemplate.findMany({
    select: {
      templateName: true,
      category: true,
      status: true,
      components: true,
      language: true
    }
  });
  console.log(JSON.stringify(templates, null, 2));
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
