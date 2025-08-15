require('dotenv').config();
const express = require('express');
const { createBot } = require('./bot/createBot');
const logger = require('./shared/logger');
const { setPaidByProviderOrderId, setFailedByProviderOrderId } = require('./services/orderService');
const { verifySignature } = require('./services/providers/sbpMock');

const app = express();
app.use(express.json({
  verify: (req, res, buf) => { req.rawBody = buf; }
}));

const bot = createBot();
const secretToken = process.env.WEBHOOK_SECRET || 'secret';
const path = `/telegraf/${secretToken}`;

app.post('/provider/webhook', async (req, res) => {
  try {
    const secret = process.env.PROVIDER_WEBHOOK_SECRET || 'secret';
    const signature = req.header('X-Provider-Signature') || '';

    // ✅ Проверяем подпись по rawBody, а не по JSON.stringify
    const okSig = verifySignature(req.rawBody || '', signature, secret);
    if (!okSig) {
      logger.warn({ body: req.body }, 'invalid webhook signature');
      return res.status(401).json({ ok: false });
    }

    const { event, providerOrderId } = req.body || {};
    if (!providerOrderId) {
      return res.status(400).json({ ok: false, error: 'providerOrderId missing' });
    }

    if (event === 'paid') {
      await setPaidByProviderOrderId(providerOrderId);
      logger.info({ providerOrderId }, 'order paid');
    } else if (event === 'failed') {
      await setFailedByProviderOrderId(providerOrderId);
      logger.info({ providerOrderId }, 'order failed');
    } else {
      logger.warn({ event }, 'unknown event');
    }

    res.json({ ok: true });
  } catch (err) {
    logger.error({ err }, 'webhook error');
    res.status(500).json({ ok: false });
  }
});

// проверка секрета делается Telegraf'ом через header X-Telegram-Bot-Api-Secret-Token
app.use(path, bot.webhookCallback(path, { secretToken }));

async function main() {
  const skipTgWebhook = process.env.SKIP_TELEGRAM_WEBHOOK === '1';

  if (!skipTgWebhook) {
    const domain = process.env.BOT_DOMAIN;
    if (!domain) throw new Error('BOT_DOMAIN missing');
    const url = `${domain}${path}`;
    await bot.telegram.setWebhook(url, { secret_token: secretToken });
    logger.info({ url }, 'Webhook set');
  } else {
    logger.warn('SKIP_TELEGRAM_WEBHOOK=1 — пропускаем setWebhook (локальный режим)');
  }

  const port = process.env.PORT || 3000;
  app.listen(port, () => logger.info(`Server on ${port}`));
}
main();

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
