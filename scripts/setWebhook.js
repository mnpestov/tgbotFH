require('dotenv').config();
const { Telegraf } = require('telegraf');

(async () => {
  const { BOT_TOKEN, WEBHOOK_SECRET, BOT_DOMAIN } = process.env;
  if (!BOT_TOKEN || !WEBHOOK_SECRET || !BOT_DOMAIN) {
    console.error('Missing env vars: BOT_TOKEN / WEBHOOK_SECRET / BOT_DOMAIN');
    process.exit(1);
  }
  const bot = new Telegraf(BOT_TOKEN);
  const path = `/telegraf/${WEBHOOK_SECRET}`;
  const url = `${BOT_DOMAIN}${path}`;
  await bot.telegram.setWebhook(url, { secret_token: WEBHOOK_SECRET });
  console.log('Webhook set to:', url);
  process.exit(0);
})();
