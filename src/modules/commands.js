const { mainMenu } = require('./keyboards');
const { Markup } = require('telegraf');
const { TARIFFS, formatRub, buildDemoSbpPayload, makeQrPngBuffer } = require('../services/payment');

function registerCommands(bot) {
  bot.command('menu', (ctx) => ctx.reply('Выберите тариф:', mainMenu()));
  bot.help((ctx) => ctx.reply('Доступно: /menu — открыть меню тарифов.'));

  // 1) Пользователь нажимает кнопку тарифов → описание + "Оплатить" (первый шаг)
  bot.hears('Тариф Базовый', (ctx) => {
    const t = TARIFFS.BASIC;
    return ctx.reply(
      `📦 *${t.title}*\n\n— Описание базового тарифа\n— Что входит\n— Срок действия\n\nЦена: ${formatRub(t.amount)}`,
      {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([
          Markup.button.callback('💳 Оплатить', 'PAY_BASIC_STEP1')
        ])
      }
    );
  });

  bot.hears('Тариф Про', (ctx) => {
    const t = TARIFFS.PRO;
    return ctx.reply(
      `🚀 *${t.title}*\n\n— Описание PRO тарифа\n— Что входит\n— Срок действия\n\nЦена: ${formatRub(t.amount)}`,
      {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([
          Markup.button.callback('💳 Оплатить', 'PAY_PRO_STEP1')
        ])
      }
    );
  });

  // 2) На "Оплатить" показываем окно заказа с кнопкой "Оплатить + <сумма>" (второй шаг)
  bot.action('PAY_BASIC_STEP1', async (ctx) => {
    await ctx.answerCbQuery();
    const t = TARIFFS.BASIC;
    return ctx.reply(
      `🧾 *Заказ*\n\nТариф: ${t.title}\nСумма: ${formatRub(t.amount)}\n\nНиже кнопка для оплаты.`,
      {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([
          Markup.button.callback(`Оплатить ${formatRub(t.amount)}`, 'PAY_BASIC_STEP2')
        ])
      }
    );
  });

  bot.action('PAY_PRO_STEP1', async (ctx) => {
    await ctx.answerCbQuery();
    const t = TARIFFS.PRO;
    return ctx.reply(
      `🧾 *Заказ*\n\nТариф: ${t.title}\nСумма: ${formatRub(t.amount)}\n\nНиже кнопка для оплаты.`,
      {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([
          Markup.button.callback(`Оплатить ${formatRub(t.amount)}`, 'PAY_PRO_STEP2')
        ])
      }
    );
  });

  // 3) На "Оплатить + <сумма>" показываем QR (демо SBP)
  bot.action('PAY_BASIC_STEP2', async (ctx) => {
    await ctx.answerCbQuery();
    const t = TARIFFS.BASIC;
    const orderId = `ORD-${Date.now()}`;
    const payload = buildDemoSbpPayload({ orderId, tariff: t });
    const png = await makeQrPngBuffer(payload);

    await ctx.replyWithPhoto({ source: png }, {
      caption: `🔗 Демо‑QR для оплаты по СБП\nЗаказ: *${orderId}*\nТариф: *${t.title}*\nСумма: *${formatRub(t.amount)}*\n\n*ВНИМАНИЕ:* это демонстрационный QR. Для реальной оплаты интегрируемся с банком/эквайером СБП.`,
      parse_mode: 'Markdown'
    });
  });

  bot.action('PAY_PRO_STEP2', async (ctx) => {
    await ctx.answerCbQuery();
    const t = TARIFFS.PRO;
    const orderId = `ORD-${Date.now()}`;
    const payload = buildDemoSbpPayload({ orderId, tariff: t });
    const png = await makeQrPngBuffer(payload);

    await ctx.replyWithPhoto({ source: png }, {
      caption: `🔗 Демо‑QR для оплаты по СБП\nЗаказ: *${orderId}*\nТариф: *${t.title}*\nСумма: *${formatRub(t.amount)}*\n\n*ВНИМАНИЕ:* это демонстрационный QR. Для реальной оплаты интегрируемся с банком/эквайером СБП.`,
      parse_mode: 'Markdown'
    });
  });
}

module.exports = { registerCommands };
