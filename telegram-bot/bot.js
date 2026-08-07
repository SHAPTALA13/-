import 'dotenv/config';
import TelegramBot from 'node-telegram-bot-api';

const token = process.env.BOT_TOKEN;
const webAppUrl = process.env.WEBAPP_URL;
if (!token || !webAppUrl) throw new Error('BOT_TOKEN and WEBAPP_URL are required');

const bot = new TelegramBot(token, { polling: true });
const keyboard = {
  inline_keyboard: [[{ text: '🚀 Открыть TONX', web_app: { url: webAppUrl } }]]
};

bot.onText(/^\/start(?:\s+(.+))?$/, async (msg, match) => {
  const name = msg.from?.first_name || 'друг';
  await bot.sendMessage(msg.chat.id,
    `Привет, ${name}!\n\nTONX — некастодиальный обменник TON. Подключай свой кошелёк и управляй обменом через TON Connect.`,
    { reply_markup: keyboard }
  );
});

bot.onText(/^\/help$/, async (msg) => {
  await bot.sendMessage(msg.chat.id, 'Нажми «Открыть TONX», чтобы открыть обменник.', { reply_markup: keyboard });
});

console.log('TONX Telegram bot is running');
