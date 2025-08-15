require('dotenv').config();
const { Telegraf, session } = require('telegraf');
const logger = require('../shared/logger');
const { registerCommands } = require('../modules/commands');
const { mainMenu } = require('../modules/keyboards');

function createBot() {
  if (!process.env.BOT_TOKEN) throw new Error('BOT_TOKEN is missing');
  const bot = new Telegraf(process.env.BOT_TOKEN, { handlerTimeout: 9000 });

  // логирование и глобальная обработка ошибок
  bot.use(async (ctx, next) => {
    logger.info(
      { update_id: ctx.update?.update_id, from: ctx.from?.id, type: Object.keys(ctx.update || {})[0] },
      'update'
    );
    try {
      await next();
    } catch (err) {
      logger.error({ err }, 'handler error');
      await ctx.reply('Упс, что-то пошло не так 🙈');
    }
  });

  bot.use(session());

  // /start показывает меню с двумя тарифами
  bot.start((ctx) => {
    ctx.reply('Привет! Выберите тариф:', mainMenu());
  });

  bot.help((ctx) => ctx.reply('Команда /menu — открыть меню тарифов.'));

  // СНАЧАЛА — регистрируем точечные обработчики (команды/меню)
  registerCommands(bot);

  // ПОТОМ — общее эхо, чтобы не перехватывать клики по кнопкам
  bot.on('text', async (ctx) => {
    // здесь можно отключить эхо совсем, но оставим как fallback
    // оно сработает только на «прочие» сообщения
    return ctx.reply(`Эхо: ${ctx.message.text}`);
  });

  return bot;
}

module.exports = { createBot };
