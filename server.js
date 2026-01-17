// Telegram бот - только ОДИН экземпляр
const TOKEN = process.env.TELEGRAM_BOT_TOKEN || '8276099439:AAGCONIKdtnW2l1UdQO18-9hdTXw-gclW3k';
const ADMIN_CHAT_ID = process.env.ADMIN_CHAT_ID || '8234693440';

console.log('🤖 Инициализация Telegram бота...');

let bot = null;
let botInitialized = false;

// Функция инициализации бота (вызывается только один раз)
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
            // Не пытаемся переподключаться автоматически
        });
        
        bot.getMe()
            .then(me => {
                console.log(`✅ Telegram бот запущен: @${me.username}`);
                console.log(`👤 ID бота: ${me.id}`);
                console.log(`📱 Ваш chat ID: ${ADMIN_CHAT_ID}`);
                botInitialized = true;
                
                // Тестовое сообщение при запуске
                setTimeout(() => {
                    bot.sendMessage(ADMIN_CHAT_ID, 
                        `🤖 Бот N • PC запущен на Render.com\n` +
                        `🌐 ${new Date().toLocaleString('ru-RU')}\n` +
                        `✅ Все системы работают`
                    ).catch(err => console.log('Не удалось отправить тестовое сообщение'));
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

// Запускаем бота только если это основной процесс
if (process.env.RENDER || process.env.NODE_ENV === 'production') {
    initTelegramBot();
} else {
    console.log('⚠️  Локальный режим - Telegram бот отключен');
}

// Функция для отправки сообщений (с защитой от ошибок)
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
}

const express = require('express');
const fs = require('fs');
const path = require('path');
const http = require('http');
const WebSocket = require('ws');
const app = express();
const PORT = 3000;

// Создаем HTTP сервер
const server = http.createServer(app);

// Создаем WebSocket сервер
const wss = new WebSocket.Server({ server });

// Храним подключенных клиентов и поддержки
const clients = new Map();
const supportClients = new Set();
const chatSessions = new Map();

let supportOnline = false;

// Функция для получения имени пользователя
function getUserName(sessionId) {
    if (!chatSessions.has(sessionId)) {
        chatSessions.set(sessionId, {
            id: sessionId,
            userName: `Гость ${chatSessions.size + 1}`,
            messages: [],
            createdAt: new Date(),
            lastActivity: new Date()
        });
    }
    return chatSessions.get(sessionId);
}

// WebSocket обработка
wss.on('connection', (ws, req) => {
    console.log('🔄 Новое подключение к WebSocket');
    
    const url = req.url;
    const isSupport = url.includes('support=true');
    
    if (isSupport) {
        console.log('👨‍💻 Подключилась поддержка');
        supportClients.add(ws);
        supportOnline = true;
        
        broadcastToClients({ type: 'support_status', online: true });
        sendActiveChatsToSupport();
        
        ws.on('message', (message) => {
            try {
                const data = JSON.parse(message);
                
                if (data.type === 'support_message') {
                    console.log(`💬 Поддержка → ${data.sessionId}: ${data.text}`);
                    
                    const session = chatSessions.get(data.sessionId);
                    if (!session) return;
                    
                    const messageObj = {
                        sender: 'support',
                        text: data.text,
                        timestamp: data.timestamp || new Date().toLocaleTimeString('ru-RU'),
                        read: true
                    };
                    session.messages.push(messageObj);
                    session.lastActivity = new Date();
                    
                    const clientWs = clients.get(data.sessionId);
                    if (clientWs && clientWs.readyState === WebSocket.OPEN) {
                        clientWs.send(JSON.stringify({
                            type: 'message',
                            sender: 'support',
                            text: data.text,
                            timestamp: messageObj.timestamp
                        }));
                    }
                    
                    return;
                }
                
                if (data.type === 'get_chat_history') {
                    const session = chatSessions.get(data.sessionId);
                    if (session) {
                        ws.send(JSON.stringify({
                            type: 'chat_history',
                            sessionId: data.sessionId,
                            messages: session.messages,
                            userName: session.userName
                        }));
                    }
                    return;
                }
                
            } catch (error) {
                console.error('Ошибка обработки сообщения поддержки:', error);
            }
        });
        
    } else {
        const sessionId = `client-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        console.log(`👤 Новый клиент: ${sessionId}`);
        
        const session = getUserName(sessionId);
        clients.set(sessionId, ws);
        ws.sessionId = sessionId;
        
        if (session.messages.length === 0) {
            setTimeout(() => {
                if (ws.readyState === WebSocket.OPEN) {
                    ws.send(JSON.stringify({
                        type: 'message',
                        sender: 'system',
                        text: '👋 Добро пожаловать в чат поддержки N • PC! Задайте свой вопрос, и мы поможем вам с выбором компьютера.',
                        timestamp: new Date().toLocaleTimeString('ru-RU')
                    }));
                }
            }, 500);
        }
        
        ws.on('message', (message) => {
            try {
                const data = JSON.parse(message);
                
                if (data.type === 'client_message') {
                    console.log(`💬 Клиент ${sessionId}: ${data.text}`);
                    
                    const messageObj = {
                        sender: 'user',
                        text: data.text,
                        timestamp: data.timestamp || new Date().toLocaleTimeString('ru-RU'),
                        read: false
                    };
                    session.messages.push(messageObj);
                    session.lastActivity = new Date();
                    
                    ws.send(JSON.stringify({
                        type: 'message',
                        sender: 'user',
                        text: data.text,
                        timestamp: messageObj.timestamp
                    }));
                    
                    supportClients.forEach(supportWs => {
                        if (supportWs.readyState === WebSocket.OPEN) {
                            supportWs.send(JSON.stringify({
                                type: 'message',
                                sender: 'user',
                                text: data.text,
                                timestamp: messageObj.timestamp,
                                sessionId: sessionId,
                                userName: session.userName
                            }));
                        }
                    });
                    
                    // ⭐⭐⭐ ОТПРАВКА УВЕДОМЛЕНИЯ В TELEGRAM ⭐⭐⭐
                    notifyTelegramAboutChatMessage(sessionId, session.userName, data.text, messageObj.timestamp);
                    
                    if (supportOnline && !session.notificationSent) {
                        setTimeout(() => {
                            if (ws.readyState === WebSocket.OPEN) {
                                ws.send(JSON.stringify({
                                    type: 'message',
                                    sender: 'system',
                                    text: '✅ Ваше сообщение получено. Ожидайте ответа от поддержки.',
                                    timestamp: new Date().toLocaleTimeString('ru-RU')
                                }));
                                session.notificationSent = true;
                            }
                        }, 1000);
                    }
                    
                    sendActiveChatsToSupport();
                    return;
                }
                
                if (data.type === 'get_support_status') {
                    ws.send(JSON.stringify({
                        type: 'support_status',
                        online: supportOnline
                    }));
                    return;
                }
                
            } catch (error) {
                console.error('Ошибка обработки сообщения клиента:', error);
            }
        });
    }
    
    ws.send(JSON.stringify({
        type: 'support_status',
        online: supportOnline
    }));
    
    ws.on('close', () => {
        console.log('🔌 Отключение WebSocket');
        
        if (isSupport) {
            supportClients.delete(ws);
            if (supportClients.size === 0) {
                supportOnline = false;
                broadcastToClients({ type: 'support_status', online: false });
            }
        } else if (ws.sessionId) {
            clients.delete(ws.sessionId);
        }
        
        sendActiveChatsToSupport();
    });
    
    ws.on('error', (error) => {
        console.error('WebSocket ошибка:', error);
    });
});

function broadcastToClients(data) {
    const message = JSON.stringify(data);
    clients.forEach((ws, sessionId) => {
        if (ws.readyState === WebSocket.OPEN) {
            ws.send(message);
        }
    });
}

function sendActiveChatsToSupport() {
    if (supportClients.size === 0) return;
    
    const activeChats = Array.from(chatSessions.values())
        .filter(session => session.messages.length > 0)
        .map(session => ({
            id: session.id,
            userName: session.userName,
            lastActivity: session.lastActivity,
            unread: session.messages.filter(m => m.sender === 'user' && !m.read).length,
            lastMessage: session.messages.length > 0 ? 
                session.messages[session.messages.length - 1].text : '',
            messageCount: session.messages.length
        }))
        .sort((a, b) => b.lastActivity - a.lastActivity);
    
    const message = JSON.stringify({
        type: 'active_chats',
        chats: activeChats
    });
    
    supportClients.forEach(ws => {
        if (ws.readyState === WebSocket.OPEN) {
            ws.send(message);
        }
    });
}

// Middleware
app.use(express.json());
app.use(express.static('.'));
app.use(express.urlencoded({ extended: true }));

app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    next();
});

// Маршрут для статуса чата
app.get('/api/chat/status', (req, res) => {
    res.json({ online: supportOnline });
});

// Путь к файлу с заявками
const ORDERS_FILE = path.join(__dirname, 'orders.json');

// Функция для чтения заявок
function readOrders() {
    try {
        if (!fs.existsSync(ORDERS_FILE)) {
            fs.writeFileSync(ORDERS_FILE, '[]');
            return [];
        }
        const data = fs.readFileSync(ORDERS_FILE, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.log('❌ Ошибка чтения файла заявок:', error);
        return [];
    }
}

// Функция для сохранения заявок
function saveOrders(orders) {
    try {
        fs.writeFileSync(ORDERS_FILE, JSON.stringify(orders, null, 2));
        console.log(`✅ Заявки сохранены. Всего: ${orders.length}`);
        return true;
    } catch (error) {
        console.log('❌ Ошибка сохранения заявок:', error);
        return false;
    }
}

// API маршруты
app.get('/api/orders', (req, res) => {
    try {
        const orders = readOrders();
        console.log(`📨 Отправлено заявок: ${orders.length}`);
        res.json(orders);
    } catch (error) {
        console.log('❌ Ошибка получения заявок:', error);
        res.status(500).json({ success: false, message: 'Ошибка сервера' });
    }
});

app.post('/api/orders', (req, res) => {
    try {
        console.log('📥 Получен запрос на создание заявки');
        
        const { purpose, budget, components, name, email, phone, comment } = req.body;
        
        if (!purpose || !budget || !name || !email || !phone) {
            console.log('❌ Не все обязательные поля заполнены');
            return res.status(400).json({ 
                success: false, 
                message: 'Заполните все обязательные поля' 
            });
        }
        
        const newOrder = {
            id: Date.now(),
            purpose,
            budget: parseInt(budget) || 0,
            components: components || '',
            name,
            email,
            phone,
            comment: comment || '',
            status: 'new',
            date: new Date().toLocaleString('ru-RU')
        };
        
        console.log('📝 Создана новая заявка:', newOrder);
        
        const orders = readOrders();
        orders.push(newOrder);
        
        const saved = saveOrders(orders);
        
        if (saved) {
            console.log(`✅ Заявка #${newOrder.id} успешно сохранена`);
            
            // Отправляем уведомление в Telegram
            notifyTelegramAboutNewOrder(newOrder);
            
            res.json({ 
                success: true, 
                message: 'Заявка успешно отправлена!',
                orderId: newOrder.id 
            });
        } else {
            throw new Error('Ошибка сохранения файла');
        }
        
    } catch (error) {
        console.log('❌ Ошибка создания заявки:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Произошла ошибка при отправке заявки' 
        });
    }
});

app.put('/api/orders/:id', (req, res) => {
    try {
        const orderId = parseInt(req.params.id);
        const { status } = req.body;
        
        console.log(`🔄 Обновление статуса заявки #${orderId} на: ${status}`);
        
        const orders = readOrders();
        const orderIndex = orders.findIndex(order => order.id === orderId);
        
        if (orderIndex !== -1) {
            const oldStatus = orders[orderIndex].status;
            orders[orderIndex].status = status;
            const saved = saveOrders(orders);
            
            if (saved) {
                console.log(`✅ Статус заявки #${orderId} обновлен на: ${status}`);
                
                notifyTelegramAboutStatusChange(orderId, oldStatus, status);
                res.json({ success: true, message: 'Статус обновлен' });
            } else {
                throw new Error('Ошибка сохранения');
            }
        } else {
            console.log(`❌ Заявка #${orderId} не найдена`);
            res.status(404).json({ success: false, message: 'Заявка не найдена' });
        }
    } catch (error) {
        console.log('❌ Ошибка обновления статуса:', error);
        res.status(500).json({ success: false, message: 'Ошибка сервера' });
    }
});

app.delete('/api/orders/:id', (req, res) => {
    try {
        const orderId = parseInt(req.params.id);
        
        console.log(`🗑️ Удаление заявки #${orderId}`);
        
        let orders = readOrders();
        const initialLength = orders.length;
        orders = orders.filter(order => order.id !== orderId);
        
        if (orders.length < initialLength) {
            const saved = saveOrders(orders);
            if (saved) {
                console.log(`✅ Заявка #${orderId} удалена`);
                res.json({ success: true, message: 'Заявка удалена' });
            } else {
                throw new Error('Ошибка сохранения');
            }
        } else {
            console.log(`❌ Заявка #${orderId} не найдена для удаления`);
            res.status(404).json({ success: false, message: 'Заявка не найдена' });
        }
    } catch (error) {
        console.log('❌ Ошибка удаления заявки:', error);
        res.status(500).json({ success: false, message: 'Ошибка сервера' });
    }
});

app.get('/api/test', (req, res) => {
    res.json({ 
        success: true, 
        message: 'API работает', 
        timestamp: new Date().toISOString(),
        telegram: telegramAvailable
    });
});

// Запуск сервера
server.listen(PORT, () => {
    console.log('═══════════════════════════════════════════════');
    console.log('🚀 СЕРВЕР N • PC ЗАПУЩЕН УСПЕШНО!');
    console.log('═══════════════════════════════════════════════');
    console.log(`🌐 Сайт:        http://localhost:${PORT}`);
    console.log(`🔧 Админка:     http://localhost:${PORT}/admin.html`);
    console.log(`💬 Чат поддержки: http://localhost:${PORT}/chat-admin.html`);
    console.log(`🛠️  Конструктор: http://localhost:${PORT}/builder.html`);
    console.log(`📞 Контакты:    http://localhost:${PORT}/contacts.html`);
    console.log(`📊 API заявок:  http://localhost:${PORT}/api/orders`);
    console.log(`💬 Live-чат:    ws://localhost:${PORT}`);
    console.log('═══════════════════════════════════════════════');
    
    if (telegramAvailable) {
        console.log('🤖 Telegram бот: ПОДКЛЮЧЕН ✅');
        console.log('📱 Уведомления будут отправляться на ваш Telegram');
    } else {
        console.log('⚠️  Telegram бот: НЕ ПОДКЛЮЧЕН');
        console.log('📦 Для включения убедитесь, что установлен:');
        console.log('   npm install node-telegram-bot-api');
    }
    
    console.log('═══════════════════════════════════════════════');
    console.log('⚡ Для остановки: Ctrl + C');
    console.log('═══════════════════════════════════════════════');

});
