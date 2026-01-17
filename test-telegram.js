// test-telegram.js
const TelegramBot = require('node-telegram-bot-api');

const TOKEN = '8276099439:AAGCONIKdtnW2l1UdQO18-9hdTXw-gclW3k';
const CHAT_ID = 8234693440;

console.log('🧪 Тестирование Telegram бота...');
console.log(`Токен: ${TOKEN.substring(0, 10)}...`);
console.log(`Chat ID: ${CHAT_ID}`);

try {
    const bot = new TelegramBot(TOKEN, { polling: false });

    // Тест 1: Проверка подключения
    console.log('🔄 Проверка подключения к Telegram API...');
    bot.getMe()
        .then(me => {
            console.log(`✅ Бот доступен: @${me.username} (${me.first_name})`);
            console.log(`🆔 ID бота: ${me.id}`);
            
            // Тест 2: Отправка сообщения
            console.log('📤 Отправка тестового сообщения...');
            return bot.sendMessage(CHAT_ID, 
                '✅ Тест Telegram бота\n' +
                `Время: ${new Date().toLocaleString('ru-RU')}\n` +
                'Бот работает корректно!'
            );
        })
        .then(sent => {
            console.log('✅ Тестовое сообщение отправлено успешно!');
            console.log('Сообщение ID:', sent.message_id);
            console.log('Дата отправки:', new Date(sent.date * 1000).toLocaleString());
            process.exit(0);
        })
        .catch(error => {
            console.error('❌ Ошибка:', error.message);
            console.error('Код ошибки:', error.code);
            console.error('Полный ответ:', error.response?.data || 'Нет данных');
            process.exit(1);
        });

} catch (error) {
    console.error('❌ Критическая ошибка:', error.message);
    process.exit(1);
}