const QRCode = require('qrcode');

// Конфиг тарифов (пока фиксированные цены)
const TARIFFS = {
  BASIC: { code: 'BASIC', title: 'Тариф Базовый', amount: 1000_00 }, // копейки
  PRO:   { code: 'PRO',   title: 'Тариф Про',     amount: 2500_00 },
};

// Утилита форматирования в рубли
function formatRub(amountKopecks) {
  return new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB' })
    .format(amountKopecks / 100);
}

// Генерация демо‑payload для QR (место для реальной SBP-интеграции)
// В реальности сюда попадают реквизиты банка/мерчанта и orderId.
function buildDemoSbpPayload({ orderId, tariff }) {
  const sum = formatRub(tariff.amount).replace(/\s/g, '');
  return `SBP|ORDER=${orderId}|TARIFF=${tariff.code}|AMOUNT=${tariff.amount}|HINT=${encodeURIComponent('ДЕМО QR, не для оплаты')}`;
}

// Генерируем PNG-буфер QR
async function makeQrPngBuffer(text) {
  return QRCode.toBuffer(text, { type: 'png', errorCorrectionLevel: 'M', margin: 2, width: 512 });
}

module.exports = {
  TARIFFS,
  formatRub,
  buildDemoSbpPayload,
  makeQrPngBuffer,
};
