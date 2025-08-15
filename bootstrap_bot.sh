#!/usr/bin/env bash
set -euo pipefail

echo ">> Ensure required folders"
mkdir -p prisma scripts src/{bot,db,modules,services,shared} tests .github/workflows

echo ">> .gitignore / .env.example"
cat > .gitignore <<'EOF'
node_modules
.env
coverage
dist
EOF

cat > .env.example <<'EOF'
BOT_TOKEN=000000:PUT-YOUR-TOKEN-HERE
WEBHOOK_SECRET=super-secret-42
BOT_DOMAIN=https://your-service.onrender.com
DATABASE_URL="file:./dev.db"
LOG_LEVEL=info
EOF

# Создадим .env, если его нет (для локальной миграции хватит DATABASE_URL)
[ -f .env ] || cp .env.example .env

echo ">> Prisma schema"
cat > prisma/schema.prisma <<'EOF'
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")
}

model User {
  id           Int      @id @default(autoincrement())
  telegramId   String   @unique
  username     String?
  firstSeenAt  DateTime @default(now())
  notes        Note[]
}

model Note {
  id        Int      @id @default(autoincrement())
  user      User     @relation(fields: [userId], references: [id])
  userId    Int
  text      String
  createdAt DateTime @default(now())
}
EOF

echo ">> Scripts: setWebhook"
cat > scripts/setWebhook.js <<'EOF'
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
EOF

echo ">> Logger"
cat > src/shared/logger.js <<'EOF'
const pino = require('pino');
module.exports = pino({ level: process.env.LOG_LEVEL || 'info' });
EOF

echo ">> Bot factory + basic handlers"
cat > src/bot/createBot.js <<'EOF'
require('dotenv').config();
const { Telegraf, session, Scenes } = require('telegraf');
const logger = require('../shared/logger');
const { registerCommands } = require('../modules/commands');
const { buildStage } = require('../modules/scenes');

function createBot() {
  if (!process.env.BOT_TOKEN) throw new Error('BOT_TOKEN is missing');
  const bot = new Telegraf(process.env.BOT_TOKEN, { handlerTimeout: 9000 });

  // базовый логгер и глобальная обработка ошибок
  bot.use(async (ctx, next) => {
    logger.info({
      update_id: ctx.update?.update_id,
      from: ctx.from?.id,
      type: Object.keys(ctx.update || {})[0]
    }, 'update');
    try {
      await next();
    } catch (err) {
      logger.error({ err }, 'handler error');
      await ctx.reply('Упс, что-то пошло не так 🙈');
    }
  });

  bot.use(session());

  bot.start((ctx) => ctx.reply('Привет! Я эхо-бот 🤖. Напиши что-нибудь.'));
  bot.help((ctx) => ctx.reply('Доступно: /start, /help, /menu — или просто напиши текст.'));

  // простое эхо
  bot.on('text', async (ctx) => ctx.reply(`Эхо: ${ctx.message.text}`));

  // сцены и команды
  const stage = buildStage();
  bot.use(stage.middleware());
  registerCommands(bot);

  return bot;
}

module.exports = { createBot };
EOF

echo ">> Polling entry"
cat > src/index.js <<'EOF'
const { createBot } = require('./bot/createBot');
const logger = require('./shared/logger');

const bot = createBot();
bot.launch().then(() => logger.info('Bot started (polling)'));

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
EOF

echo ">> Webhook server (Express)"
cat > src/server.js <<'EOF'
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
EOF

echo ">> Keyboards"
cat > src/modules/keyboards.js <<'EOF'
const { Markup } = require('telegraf');

const mainMenu = () =>
  Markup.keyboard([['➕ Добавить заметку'], ['📄 Список', '❌ Удалить']])
    .resize()
    .oneTime();

const inlineHelp = () =>
  Markup.inlineKeyboard([
    Markup.button.url('Telegraf Docs', 'https://telegraf.js.org/'),
    Markup.button.callback('Пинг', 'PING')
  ]);

module.exports = { mainMenu, inlineHelp };
EOF

echo ">> Commands"
cat > src/modules/commands.js <<'EOF'
const { z } = require('zod');
const { mainMenu, inlineHelp } = require('./keyboards');

const setNameSchema = z.object({ name: z.string().min(2).max(32) });

function registerCommands(bot) {
  bot.command('menu', (ctx) => ctx.reply('Меню:', mainMenu()));
  bot.command('help', (ctx) => ctx.reply('Команды: /menu, /setname <имя>', inlineHelp()));

  bot.hears('➕ Добавить заметку', (ctx) => ctx.scene.enter('note:new'));
  bot.hears('📄 Список', (ctx) => ctx.scene.enter('note:list'));
  bot.hears('❌ Удалить', (ctx) => ctx.scene.enter('note:del'));

  bot.command('setname', (ctx) => {
    const [, ...rest] = (ctx.message.text || '').split(' ');
    const candidate = { name: rest.join(' ') };
    const parsed = setNameSchema.safeParse(candidate);
    if (!parsed.success) return ctx.reply('Имя от 2 до 32 символов.');
    ctx.session.profile = { ...(ctx.session.profile || {}), name: parsed.data.name };
    return ctx.reply(`Ок! Буду звать вас: ${parsed.data.name}`);
  });

  bot.action('PING', async (ctx) => {
    await ctx.answerCbQuery('pong');
    await ctx.reply('pong 🏓');
  });
}

module.exports = { registerCommands };
EOF

echo ">> Scenes (simple notes FSM)"
cat > src/modules/scenes.js <<'EOF'
const { Scenes } = require('telegraf');
const noteService = require('../services/noteService');

const newNote = new Scenes.BaseScene('note:new');
newNote.enter((ctx) => ctx.reply('Введи текст заметки:'));
newNote.on('text', async (ctx) => {
  const text = ctx.message.text?.trim();
  if (!text) return ctx.reply('Пусто. Введи текст.');
  await noteService.createNote(ctx.from.id.toString(), text, ctx.from?.username);
  await ctx.reply('Сохранено ✅');
  return ctx.scene.leave();
});

const listNotes = new Scenes.BaseScene('note:list');
listNotes.enter(async (ctx) => {
  const notes = await noteService.listNotes(ctx.from.id.toString());
  if (!notes.length) return ctx.reply('Пока пусто.');
  const formatted = notes.map(n => `${n.id}. ${n.text}`).join('\n');
  return ctx.reply(`Твои заметки:\n${formatted}`);
});

const delNote = new Scenes.BaseScene('note:del');
delNote.enter((ctx) => ctx.reply('Отправь ID заметки для удаления:'));
delNote.on('text', async (ctx) => {
  const id = Number(ctx.message.text);
  if (!Number.isFinite(id)) return ctx.reply('Нужен числовой ID.');
  const ok = await noteService.deleteNote(ctx.from.id.toString(), id);
  await ctx.reply(ok ? 'Удалено ✅' : 'Не найдено.');
  return ctx.scene.leave();
});

function buildStage() {
  return new Scenes.Stage([newNote, listNotes, delNote]);
}

module.exports = { buildStage };
EOF

echo ">> Prisma client wrapper"
cat > src/db/prisma.js <<'EOF'
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
module.exports = { prisma };
EOF

echo ">> Note service"
cat > src/services/noteService.js <<'EOF'
const { prisma } = require('../db/prisma');

async function ensureUser(telegramId, username) {
  let user = await prisma.user.findUnique({ where: { telegramId } });
  if (!user) user = await prisma.user.create({ data: { telegramId, username } });
  return user;
}

async function createNote(telegramId, text, username) {
  const user = await ensureUser(telegramId, username);
  const note = await prisma.note.create({ data: { userId: user.id, text } });
  return note;
}

async function listNotes(telegramId) {
  const user = await prisma.user.findUnique({ where: { telegramId } });
  if (!user) return [];
  return prisma.note.findMany({ where: { userId: user.id }, orderBy: { id: 'asc' } });
}

async function deleteNote(telegramId, noteId) {
  const user = await prisma.user.findUnique({ where: { telegramId } });
  if (!user) return false;
  const note = await prisma.note.findFirst({ where: { id: noteId, userId: user.id } });
  if (!note) return false;
  await prisma.note.delete({ where: { id: note.id } });
  return true;
}

module.exports = { createNote, listNotes, deleteNote };
EOF

echo ">> Tiny unit test example"
cat > tests/parseArgs.test.js <<'EOF'
function extractArgs(text) {
  if (!text) return [];
  const [, ...rest] = text.trim().split(/\s+/);
  return rest;
}
test('extracts args after command', () => {
  expect(extractArgs('/setname John Doe')).toEqual(['John', 'Doe']);
});
EOF

echo ">> GitHub Actions CI"
cat > .github/workflows/ci.yml <<'EOF'
name: ci
on: [push, pull_request]
jobs:
  node:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 'lts/*' }
      - run: npm ci
      - run: npm test
      - run: npm run lint || true
EOF

echo ">> Patch package.json (add scripts safely)"
node - <<'NODE'
const fs = require('fs');
const pj = JSON.parse(fs.readFileSync('package.json','utf8'));
pj.scripts = {
  ...(pj.scripts||{}),
  "dev": "nodemon src/index.js",
  "start:polling": "node src/index.js",
  "start:webhook": "node src/server.js",
  "prisma:init": "prisma init",
  "prisma:dev": "prisma generate && prisma migrate dev --name init",
  "prisma:deploy": "prisma generate && prisma migrate deploy",
  "lint": pj.scripts?.lint || "eslint .",
  "test": pj.scripts?.test || "jest --passWithNoTests",
  "set-webhook": "node scripts/setWebhook.js"
};
fs.writeFileSync('package.json', JSON.stringify(pj, null, 2));
console.log('package.json scripts updated');
NODE

echo ">> Prisma generate & migrate (dev)"
npx prisma generate
npx prisma migrate dev --name init --skip-seed

echo ">> Done. Next steps:"
echo "1) Открой .env и заполни BOT_TOKEN, BOT_DOMAIN (оставь DATABASE_URL для SQLite)"
echo "2) npm run dev  — локальный запуск (polling)"
echo "3) Готовь деплой (Render): npm run start:webhook на проде"
