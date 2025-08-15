const { createBot } = require('./bot/createBot');
const logger = require('./shared/logger');

const bot = createBot();
bot.launch().then(() => logger.info('Bot started (polling)'));

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
