const express = require('express');
const TelegramBot = require('node-telegram-bot-api');
const fs = require('fs');
const path = require('path');
const http = require('http');
const WebSocket = require('ws');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// ==================== TELEGRAM БОТ ====================
const TOKEN = process.env.TELEGRAM_BOT_TOKEN || '8276099439:AAGCONIKdtnW2l1UdQO18-9hdTXw-gclW3k';
const ADMIN_CHAT_ID = process.env.ADMIN_CHAT_ID || '8234693440';

console.log('🤖 Инициализация Telegram бота...');

let bot = null;
let botInitialized = false;

// Функция инициализации бота
function initTelegramBot() {
    if (botInitialized) return;
    
    try {
        console.log('🔄 Создаем Telegram бота...');
        bot = new TelegramBot(TOKEN, { 
            polling: {
                interval: 300,
                timeout: 10,
                autoStart: true
            }
        });
        
        bot.on('polling_error', (error) => {
            console.error('❌ Telegram polling error:', error.message);
        });
        
        bot.getMe()
            .then(me => {
                console.log(`✅ Telegram бот запущен: @${me.username}`);
                console.log(`👤 ID бота: ${me.id}`);
                console.log(`📱 Ваш chat ID: ${ADMIN_CHAT_ID}`);
                botInitialized = true;
                
                // Тестовое сообщение при запуске
                setTimeout(() => {
                    sendTelegramMessage(
                        `🤖 Бот N • PC запущен на Render.com\n` +
                        `🌐 ${new Date().toLocaleString('ru-RU')}\n` +
                        `✅ Все системы работают`
                    );
                }, 3000);
            })
            .catch(error => {
                console.error('❌ Ошибка инициализации бота:', error.message);
                bot = null;
            });
            
    } catch (error) {
        console.error('❌ Ошибка создания бота:', error.message);
        bot = null;
    }
}

// Функция для отправки сообщений
async function sendTelegramMessage(text) {
    if (!bot || !botInitialized) {
        console.log('📝 Telegram недоступен:', text.substring(0, 100));
        return false;
    }
    
    try {
        await bot.sendMessage(ADMIN_CHAT_ID, text);
        console.log('✅ Сообщение отправлено в Telegram');
        return true;
    } catch (error) {
        console.error('❌ Ошибка отправки в Telegram:', error.message);
        return false;
    }
}

// Запускаем бота только на Render
if (process.env.RENDER || process.env.NODE_ENV === 'production') {
    initTelegramBot();
} else {
    console.log('⚠️  Локальный режим - Telegram бот отключен');
}

// ==================== WEB SOCKET ДЛЯ РЕНДЕРА ====================
const server = http.createServer(app);
const wss = new WebSocket.Server({ 
    server,
    clientTracking: true
});

const chatClients = new Set();
const chatSessions = new Map();

wss.on('connection', (ws, req) => {
    console.log('🔗 Новое WebSocket подключение');
    chatClients.add(ws);
    
    const sessionId = `client-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    ws.on('message', async (data) => {
        try {
            const message = JSON.parse(data.toString());
            
            if (message.type === 'chat_message') {
                const userName = message.user || 'Гость';
                const userMessage = message.text;
                
                console.log(`💬 Чат [${sessionId}]: ${userName}: ${userMessage}`);
                
                // Отправляем в Telegram
                await sendTelegramMessage(
                    `💬 Новое сообщение в чате\n` +
                    `👤 ${userName}\n` +
                    `📝 ${userMessage}\n` +
                    `🆔 ${sessionId}`
                );
                
                // Сохраняем в сессии
                if (!chatSessions.has(sessionId)) {
                    chatSessions.set(sessionId, {
                        id: sessionId,
                        userName: userName,
                        messages: [],
                        lastActivity: new Date()
                    });
                }
                
                const session = chatSessions.get(sessionId);
                session.messages.push({
                    sender: 'user',
                    text: userMessage,
                    timestamp: new Date().toLocaleTimeString('ru-RU')
                });
                session.lastActivity = new Date();
                
                // Рассылаем всем подключенным клиентам
                chatClients.forEach(client => {
                    if (client.readyState === 1) { // OPEN
                        client.send(JSON.stringify({
                            type: 'chat_message',
                            sessionId: sessionId,
                            user: userName,
                            text: userMessage,
                            time: new Date().toLocaleTimeString('ru-RU')
                        }));
                    }
                });
            }
            
            if (message.type === 'support_message') {
                const { sessionId: targetSessionId, text } = message;
                
                console.log(`💬 Поддержка → ${targetSessionId}: ${text}`);
                
                // Отправляем конкретному клиенту
                chatClients.forEach(client => {
                    if (client.readyState === 1) {
                        client.send(JSON.stringify({
                            type: 'support_message',
                            sender: 'support',
                            text: text,
                            time: new Date().toLocaleTimeString('ru-RU')
                        }));
                    }
                });
            }
            
        } catch (error) {
            console.error('WebSocket error:', error);
        }
    });
    
    ws.on('close', () => {
        console.log('🔌 WebSocket отключение:', sessionId);
        chatClients.delete(ws);
        chatSessions.delete(sessionId);
    });
    
    ws.on('error', (error) => {
        console.error('WebSocket error:', error);
    });
    
    // Приветственное сообщение
    ws.send(JSON.stringify({
        type: 'connected',
        sessionId: sessionId,
        message: '👋 Добро пожаловать в чат поддержки N • PC!'
    }));
});

// ==================== НАСТРОЙКА EXPRESS ====================
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

// ==================== ХРАНЕНИЕ ЗАЯВОК ====================
const ORDERS_FILE = path.join(__dirname, 'orders.json');

function readOrders() {
    try {
        if (!fs.existsSync(ORDERS_FILE)) {
            fs.writeFileSync(ORDERS_FILE, '[]');
            return [];
        }
        const data = fs.readFileSync(ORDERS_FILE, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error('❌ Ошибка чтения заявок:', error);
        return [];
    }
}

function saveOrders(orders) {
    try {
        fs.writeFileSync(ORDERS_FILE, JSON.stringify(orders, null, 2));
        return true;
    } catch (error) {
        console.error('❌ Ошибка сохранения заявок:', error);
        return false;
    }
}

// ==================== API МАРШРУТЫ ====================

// Проверка здоровья
app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        telegram: botInitialized,
        orders: readOrders().length,
        chatClients: chatClients.size
    });
});

// Получить все заявки
app.get('/api/orders', (req, res) => {
    try {
        const orders = readOrders();
        res.json(orders);
    } catch (error) {
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// Создать новую заявку
app.post('/api/orders', async (req, res) => {
    try {
        const { name, phone, email, purpose, budget, components, comment } = req.body;
        
        if (!name || !phone) {
            return res.status(400).json({ error: 'Заполните имя и телефон' });
        }
        
        const newOrder = {
            id: Date.now(),
            name,
            phone,
            email: email || '',
            purpose: purpose || 'Не указано',
            budget: budget || 0,
            components: components || '',
            comment: comment || '',
            status: 'new',
            date: new Date().toLocaleString('ru-RU')
        };
        
        // Сохраняем заявку
        const orders = readOrders();
        orders.push(newOrder);
        saveOrders(orders);
        
        console.log(`✅ Новая заявка #${newOrder.id}: ${name}, ${phone}`);
        
        // Отправляем уведомление в Telegram
        const telegramMessage = `
🆕 НОВАЯ ЗАЯВКА #${newOrder.id}
━━━━━━━━━━━━━━━━━━━━
👤 Имя: ${name}
📞 Телефон: ${phone}
📧 Email: ${email || 'Не указан'}
🎯 Цель: ${purpose || 'Не указано'}
💰 Бюджет: ${budget || 0} ₽
💬 Комментарий: ${comment || 'Нет'}
━━━━━━━━━━━━━━━━━━━━
🌐 Сайт: ${req.headers.host}
📅 ${newOrder.date}`;
        
        await sendTelegramMessage(telegramMessage);
        
        res.json({ 
            success: true, 
            message: 'Заявка успешно отправлена!',
            orderId: newOrder.id 
        });
        
    } catch (error) {
        console.error('Ошибка создания заявки:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// Обновить статус заявки
app.put('/api/orders/:id', async (req, res) => {
    try {
        const orderId = parseInt(req.params.id);
        const { status } = req.body;
        
        let orders = readOrders();
        const orderIndex = orders.findIndex(o => o.id === orderId);
        
        if (orderIndex === -1) {
            return res.status(404).json({ error: 'Заявка не найдена' });
        }
        
        const oldStatus = orders[orderIndex].status;
        orders[orderIndex].status = status;
        
        if (saveOrders(orders)) {
            // Уведомление в Telegram
            const statusNames = {
                'new': '🆕 Новая',
                'in-progress': '🔄 В работе',
                'completed': '✅ Завершена'
            };
            
            const message = `📊 Изменён статус заявки #${orderId}\n${statusNames[oldStatus] || oldStatus} → ${statusNames[status] || status}`;
            await sendTelegramMessage(message);
            
            res.json({ success: true });
        } else {
            res.status(500).json({ error: 'Ошибка сохранения' });
        }
        
    } catch (error) {
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// Удалить заявку
app.delete('/api/orders/:id', (req, res) => {
    try {
        const orderId = parseInt(req.params.id);
        
        let orders = readOrders();
        const filtered = orders.filter(o => o.id !== orderId);
        
        if (filtered.length < orders.length && saveOrders(filtered)) {
            res.json({ success: true });
        } else {
            res.status(404).json({ error: 'Заявка не найдена' });
        }
        
    } catch (error) {
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// ==================== ЗАПУСК СЕРВЕРА ====================
server.listen(PORT, () => {
    console.log('═══════════════════════════════════════════════');
    console.log('🚀 СЕРВЕР N • PC ЗАПУЩЕН УСПЕШНО!');
    console.log('═══════════════════════════════════════════════');
    console.log(`🌐 Порт: ${PORT}`);
    console.log(`🤖 Telegram бот: ${botInitialized ? 'АКТИВЕН ✅' : 'ОШИБКА ❌'}`);
    console.log(`💬 WebSocket чат: ГОТОВ (клиентов: ${chatClients.size})`);
    console.log(`📊 Заявок в базе: ${readOrders().length}`);
    console.log('═══════════════════════════════════════════════');
    console.log(`📝 Проверка: http://localhost:${PORT}/api/health`);
    console.log('═══════════════════════════════════════════════');
});
