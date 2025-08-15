const QRCode = require('qrcode');
const crypto = require('crypto');

// Простой «временный» провайдер.
// Имитирует создание инвойса и отдаёт QR.
// Реальный провайдер вернёт providerOrderId и payload для QR.

async function createInvoice({ tariffCode, amountKopecks }) {
    const providerOrderId = 'MOCK-' + Date.now();
    const payload = `SBP|ORDER=${providerOrderId}|TARIFF=${tariffCode}|AMOUNT=${amountKopecks}|NOTE=${encodeURIComponent('DEMO')}`;
    const qrPng = await QRCode.toBuffer(payload, { type: 'png', errorCorrectionLevel: 'M', margin: 2, width: 512 });
    return { providerOrderId, qrPng };
}

// Подпись вебхука (простая схема через общий секрет)
function sign(body, secret) {
    return crypto.createHmac('sha256', secret).update(JSON.stringify(body)).digest('hex');
}

// function verifySignature(body, signature, secret) {
//   const calc = sign(body, secret);
//   return crypto.timingSafeEqual(Buffer.from(signature, 'hex'), Buffer.from(calc, 'hex'));
// }

function verifySignature(rawBody, signature, secret) {
    const calc = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
    try {
        return crypto.timingSafeEqual(Buffer.from(signature, 'hex'), Buffer.from(calc, 'hex'));
    } catch {
        return false;
    }
}

module.exports = { createInvoice, verifySignature };
