const { mainMenu } = require('./keyboards');

function registerCommands(bot) {
  // Показываем меню
  bot.command('menu', (ctx) => ctx.reply('Выберите тариф:', mainMenu()));
  bot.command('help', (ctx) =>
    ctx.reply('Доступно: /menu — открыть меню тарифов. Пока доступны две кнопки.')
  );

  // Обработчики нажатий на кнопки меню
  bot.hears('Тариф Базовый', (ctx) => {
    return ctx.reply('Вы выбрали «Тариф Базовый». Описание и оплату подключим на следующем шаге.');
  });

  bot.hears('Тариф Про', (ctx) => {
    return ctx.reply('Вы выбрали «Тариф Про». Описание и оплату подключим на следующем шаге.');
  });
}

module.exports = { registerCommands };
