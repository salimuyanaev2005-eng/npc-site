const TelegramBot = require('node-telegram-bot-api');

const TOKEN = '8276099439:AAGCONIKdtnW2l1UdQO18-9hdTXw-gclW3k';
const ADMIN_CHAT_ID = 8234693440;

console.log('🤖 Инициализация Telegram бота...');

let bot;
let botReady = false;

try {
    bot = new TelegramBot(TOKEN, {
        polling: {
            interval: 300,
            autoStart: true
        }
    });

    bot.getMe()
        .then(me => {
            console.log(`✅ Бот @${me.username} запущен!`);
            botReady = true;
            
            bot.onText(/\/start/, (msg) => {
                bot.sendMessage(msg.chat.id, `🤖 Бот N • PC активен! Ваш ID: ${msg.chat.id}`);
            });

            bot.on('message', (msg) => {
                if (msg.text && !msg.text.startsWith('/')) {
                    console.log('📩 Сообщение от пользователя:', msg.text);
                }
            });

        })
        .catch(error => {
            console.error('❌ Ошибка подключения бота:', error.message);
            botReady = false;
        });

} catch (error) {
    console.error('❌ Не удалось создать бота:', error.message);
    botReady = false;
}

// Функция отправки уведомления о новой заявке
function sendNewOrderNotification(order) {
    if (!bot || !botReady) {
        console.log(`📝 Заявка #${order.id} (Telegram недоступен)`);
        return Promise.resolve(false);
    }

    console.log(`📤 Отправка в Telegram заявки #${order.id}...`);
    
    const message = `
🆕 НОВАЯ ЗАЯВКА С САЙТА
━━━━━━━━━━━━━━━━━━━━
🆔 ID: #${order.id}
👤 Имя: ${order.name}
📞 Телефон: ${order.phone}
📧 Email: ${order.email}
━━━━━━━━━━━━━━━━━━━━
🎯 Цель: ${order.purpose}
💰 Бюджет: ${order.budget || 0} ₽
━━━━━━━━━━━━━━━━━━━━
🛠️ Компоненты:
${order.components || 'Не указано'}
━━━━━━━━━━━━━━━━━━━━
💬 Комментарий:
${order.comment || 'Нет комментария'}
━━━━━━━━━━━━━━━━━━━━
📅 Дата: ${order.date}`;

    return bot.sendMessage(ADMIN_CHAT_ID, message)
        .then(() => {
            console.log(`✅ Заявка #${order.id} отправлена в Telegram`);
            return true;
        })
        .catch(error => {
            console.error(`❌ Ошибка отправки заявки #${order.id}:`, error.message);
            return false;
        });
}

// Функция отправки уведомления о сообщении в чате
function sendNewChatMessageNotification(sessionId, userName, text, timestamp) {
    if (!bot || !botReady) {
        console.log(`💬 Чат: ${userName}: ${text} (Telegram недоступен)`);
        return Promise.resolve(false);
    }

    console.log(`📤 Отправка уведомления о чате в Telegram...`);
    
    const shortText = text.length > 100 ? text.substring(0, 100) + '...' : text;
    
    const message = `💬 НОВОЕ СООБЩЕНИЕ В ЧАТЕ
━━━━━━━━━━━━━━━━━━━━
👤 Клиент: ${userName}
📝 Сообщение: ${shortText}
⏰ Время: ${timestamp}
━━━━━━━━━━━━━━━━━━━━
📁 ID сессии: ${sessionId}
💻 Ответить: http://localhost:3000/chat-admin.html?session=${sessionId}`;

    return bot.sendMessage(ADMIN_CHAT_ID, message)
        .then(() => {
            console.log(`✅ Уведомление о чате отправлено для сессии ${sessionId}`);
            return true;
        })
        .catch(error => {
            console.error(`❌ Ошибка отправки уведомления чата:`, error.message);
            return false;
        });
}

// Функция отправки уведомления об изменении статуса
function sendStatusChangeNotification(orderId, oldStatus, newStatus) {
    if (!bot || !botReady) {
        return Promise.resolve(false);
    }

    const statusNames = {
        'new': '🆕 Новая',
        'in-progress': '🔄 В работе',
        'completed': '✅ Завершена'
    };

    const message = `📊 Обновление статуса
━━━━━━━━━━━━━━━━━━━━
🆔 Заявка: #${orderId}
📊 Статус: ${statusNames[oldStatus] || oldStatus} → ${statusNames[newStatus] || newStatus}
⏰ ${new Date().toLocaleString('ru-RU')}`;

    return bot.sendMessage(ADMIN_CHAT_ID, message)
        .catch(error => console.error('Ошибка отправки статуса:', error.message));
}

// Экспорт функций
module.exports = {
    sendNewOrderNotification,
    sendNewChatMessageNotification,
    sendStatusChangeNotification,
    bot,
    ADMIN_CHAT_ID,
    isReady: () => botReady
};