const { prisma } = require('../db/prisma');
const logger = require('../shared/logger');

async function createOrder({ tgUserId, chatId, tariffCode, amountKopecks, provider, providerOrderId }) {
  const order = await prisma.order.create({
    data: { tgUserId, chatId, tariffCode, amountKopecks, provider, providerOrderId }
  });
  logger.info({ orderId: order.id, providerOrderId, status: order.status }, 'order created');
  return order;
}

async function setPaidByProviderOrderId(providerOrderId) {
  return prisma.order.update({
    where: { providerOrderId },
    data: { status: 'PAID' }
  });
}

async function setFailedByProviderOrderId(providerOrderId) {
  return prisma.order.update({
    where: { providerOrderId },
    data: { status: 'FAILED' }
  });
}

async function getByProviderOrderId(providerOrderId) {
  return prisma.order.findUnique({ where: { providerOrderId } });
}

module.exports = { createOrder, setPaidByProviderOrderId, setFailedByProviderOrderId, getByProviderOrderId };
