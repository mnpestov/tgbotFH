require('dotenv').config();
const express = require('express');
const { createBot } = require('./bot/createBot');
const logger = require('./shared/logger');

const app = express();
app.use(express.json());

const bot = createBot();
const secretToken = process.env.WEBHOOK_SECRET || 'secret';
const path = `/telegraf/${secretToken}`;

// проверка секрета делается Telegraf'ом через header X-Telegram-Bot-Api-Secret-Token
app.use(path, bot.webhookCallback(path, { secretToken }));

async function main() {
  const domain = process.env.BOT_DOMAIN;
  if (!domain) throw new Error('BOT_DOMAIN missing');
  const url = `${domain}${path}`;
  await bot.telegram.setWebhook(url, { secret_token: secretToken });
  logger.info({ url }, 'Webhook set');

  const port = process.env.PORT || 3000;
  app.listen(port, () => logger.info(`Server on ${port}`));
}
main();

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
