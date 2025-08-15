// scripts/backfill_chatId.js
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  const updated = await prisma.order.updateMany({
    where: { chatId: null },
    data: { chatId: prisma.order.fields.tgUserId } // копируем tgUserId в chatId
  }).catch(async (e) => {
    // если ваша версия Prisma не поддерживает fields alias в updateMany,
    // сделаем вручную:
    const rows = await prisma.order.findMany({ where: { chatId: null } });
    for (const o of rows) {
      await prisma.order.update({ where: { id: o.id }, data: { chatId: o.tgUserId } });
    }
    return { count: rows.length };
  });

  console.log(`Backfilled chatId for ${updated.count} rows`);
  await prisma.$disconnect();
})();
