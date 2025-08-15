const { prisma } = require('../db/prisma');
const logger = require('../shared/logger');

// async function createOrder({ tgUserId, tariffCode, amountKopecks, provider, providerOrderId }) {
//   return prisma.order.create({
//     data: { tgUserId, tariffCode, amountKopecks, provider, providerOrderId }
//   });
// }

async function createOrder({ tgUserId, tariffCode, amountKopecks, provider, providerOrderId }) {
  const order = await prisma.order.create({
    data: { tgUserId, tariffCode, amountKopecks, provider, providerOrderId }
  });
  logger.info({ orderId: order.id, providerOrderId, status: order.status }, 'order created'); // ⬅️ лог
  return order;
}

async function setPaidByProviderOrderId(providerOrderId) {
  const order = await prisma.order.update({
    where: { providerOrderId },
    data: { status: 'PAID' }
  });
  return order;
}

async function setFailedByProviderOrderId(providerOrderId) {
  const order = await prisma.order.update({
    where: { providerOrderId },
    data: { status: 'FAILED' }
  });
  return order;
}

module.exports = { createOrder, setPaidByProviderOrderId, setFailedByProviderOrderId };
