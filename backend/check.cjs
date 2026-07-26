const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
prisma.member.findMany().then(res => { console.log('MEMBERS_COUNT:', res.length); return prisma.$disconnect(); }).catch(console.error);
