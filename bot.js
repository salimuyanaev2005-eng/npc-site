const TelegramBot = require('node-telegram-bot-api');
const HttpsProxyAgent = require('https-proxy-agent');

const TOKEN = '8276099439:AAGCONIKdtnW2l1UdQO18-9hdTXw-gclW3k';
const ADMIN_CHAT_ID = '8234693440';

// ←←←  СЮДА СВОЙ РАБОЧИЙ ПРОКСИ  ←←←
// Примеры (могут умереть к моменту чтения):
// const PROXY_URL = 'http://45.142.115.172:80';
// const PROXY_URL = 'http://103.153.154.25:80';
// Лучше взять свежий список здесь: https://free-proxy-list.net/
const PROXY_URL = 'http://ВАШ_ПРОКСИ_СЮДА:ПОРТ';

let bot;

try {
    const agent = new HttpsProxyAgent(PROXY_URL);

    bot = new TelegramBot(TOKEN, {
        polling: true,
        request: {
            agent: agent,
            timeout: 15000,        // увеличиваем таймауты
            url: 'https://api.telegram.org'
        }
    });

    console.log('🤖 Пытаемся запуститься через прокси HTTP:', PROXY_URL);

} catch (e) {
    console.error('Ошибка создания бота с прокси:', e);
    process.exit(1);
}

// Дальше обычная логика твоего бота
bot.getMe()
    .then(me => {
        console.log(`✅ Бот @${me.username} успешно запустился через прокси!`);
    })
    .catch(err => {
        console.error('❌ Не удалось подключиться даже через прокси:', err.message);
    });

// Пример отправки уведомления (как было раньше)
function sendNewOrderNotification(order) {
    const message = `🆕 Новая заявка #${order.id}\nИмя: ${order.name}\nТелефон: ${order.phone}\nБюджет: ${order.budget}₽`;
    
    bot.sendMessage(ADMIN_CHAT_ID, message, { parse_mode: 'Markdown' })
        .then(() => console.log('Уведомление отправлено'))
        .catch(e => console.error('Ошибка отправки:', e.message));
}

module.exports = {
    sendNewOrderNotification,
    bot,
    ADMIN_CHAT_ID
};