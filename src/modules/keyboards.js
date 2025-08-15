const { Markup } = require('telegraf');

const mainMenu = () =>
  Markup.keyboard([['Тариф Базовый', 'Тариф Про']]).resize();

module.exports = { mainMenu };
