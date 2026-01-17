const express = require('express');
const TelegramBot = require('node-telegram-bot-api');
const WebSocket = require('ws');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// ==================== TELEGRAM БОТ ====================
const TOKEN = process.env.TELEGRAM_BOT_TOKEN || '8276099439:AAGCONIKdtnW2l1UdQO18-9hdTXw-gclW3k';
const ADMIN_CHAT_ID = process.env.ADMIN_CHAT_ID || '8234693440';

console.log('🤖 Запускаем Telegram бота...');
let bot;
try {
    bot = new TelegramBot(TOKEN, { 
        polling: true,
        request: {
            timeout: 30000
        }
    });
    
    bot.getMe().then(me => {
        console.log(`✅ Бот запущен: @${me.username}`);
    }).catch(err => {
        console.error('❌ Ошибка Telegram бота:', err.message);
    });
    
    // Команда /start
    bot.onText(/\/start/, (msg) => {
        bot.sendMessage(msg.chat.id, `🤖 Бот N • PC активен!\nВаш ID: ${msg.chat.id}`);
    });
    
} catch (error) {
    console.error('❌ Не удалось создать бота:', error.message);
}

// ==================== WEB SOCKET ДЛЯ ЧАТА ====================
const server = require('http').createServer(app);
const wss = new WebSocket.Server({ server });

const chatClients = new Map();
const chatMessages = [];

wss.on('connection', (ws, req) => {
    const clientId = Date.now();
    const ip = req.socket.remoteAddress;
    
    console.log(`🔗 Новое подключение WebSocket: ${clientId} (${ip})`);
    chatClients.set(clientId, ws);
    
    // Отправляем историю сообщений новому клиенту
    ws.send(JSON.stringify({
        type: 'chat_history',
        messages: chatMessages.slice(-50) // последние 50 сообщений
    }));
    
    ws.on('message', (data) => {
        try {
            const message = JSON.parse(data);
            
            if (message.type === 'chat_message') {
                const chatMessage = {
                    id: Date.now(),
                    user: message.user || 'Гость',
                    text: message.text,
                    time: new Date().toLocaleTimeString('ru-RU'),
                    date: new Date().toLocaleDateString('ru-RU')
                };
                
                // Сохраняем сообщение
                chatMessages.push(chatMessage);
                
                // Отправляем всем клиентам
                chatClients.forEach((client, id) => {
                    if (client.readyState === WebSocket.OPEN) {
                        client.send(JSON.stringify({
                            type: 'new_message',
                            message: chatMessage
                        }));
                    }
                });
                
                // Отправляем уведомление в Telegram
                if (bot) {
                    const tgMessage = `💬 Новое сообщение в чате\n👤 ${chatMessage.user}\n📝 ${chatMessage.text}\n⏰ ${chatMessage.time}`;
                    bot.sendMessage(ADMIN_CHAT_ID, tgMessage)
                        .catch(err => console.error('Ошибка отправки в Telegram:', err.message));
                }
                
                console.log(`💬 Чат: ${chatMessage.user}: ${chatMessage.text}`);
            }
            
        } catch (error) {
            console.error('Ошибка обработки WebSocket сообщения:', error);
        }
    });
    
    ws.on('close', () => {
        console.log(`🔌 Отключение WebSocket: ${clientId}`);
        chatClients.delete(clientId);
    });
    
    ws.on('error', (error) => {
        console.error(`❌ WebSocket ошибка ${clientId}:`, error);
    });
});

// ==================== ХРАНЕНИЕ ЗАЯВОК ====================
const ORDERS_FILE = path.join(__dirname, 'orders.json');

function readOrders() {
    try {
        if (fs.existsSync(ORDERS_FILE)) {
            const data = fs.readFileSync(ORDERS_FILE, 'utf8');
            return JSON.parse(data);
        }
    } catch (error) {
        console.error('Ошибка чтения заявок:', error);
    }
    return [];
}

function saveOrders(orders) {
    try {
        fs.writeFileSync(ORDERS_FILE, JSON.stringify(orders, null, 2));
        return true;
    } catch (error) {
        console.error('Ошибка сохранения заявок:', error);
        return false;
    }
}

// ==================== НАСТРОЙКА EXPRESS ====================
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

// ==================== API МАРШРУТЫ ====================

// Главная страница
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
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
            return res.status(400).json({ error: 'Заполните обязательные поля' });
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
        if (bot) {
            const message = `
🆕 НОВАЯ ЗАЯВКА #${newOrder.id}
━━━━━━━━━━━━━━━━━━━━
👤 Имя: ${name}
📞 Телефон: ${phone}
📧 Email: ${email || 'Не указан'}
🎯 Цель: ${purpose || 'Не указано'}
💰 Бюджет: ${budget || 0} ₽
━━━━━━━━━━━━━━━━━━━━
💬 Комментарий:
${comment || 'Нет комментария'}
━━━━━━━━━━━━━━━━━━━━
🌐 Сайт: ${req.headers.host}
📅 ${newOrder.date}`;
            
            bot.sendMessage(ADMIN_CHAT_ID, message)
                .then(() => console.log(`📨 Уведомление отправлено в Telegram`))
                .catch(err => console.error('Ошибка Telegram:', err.message));
        }
        
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
app.put('/api/orders/:id', (req, res) => {
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
            // Уведомление в Telegram об изменении статуса
            if (bot) {
                const statusNames = {
                    'new': '🆕 Новая',
                    'in-progress': '🔄 В работе',
                    'completed': '✅ Завершена'
                };
                
                const message = `📊 Изменён статус заявки #${orderId}\n${statusNames[oldStatus] || oldStatus} → ${statusNames[status] || status}`;
                bot.sendMessage(ADMIN_CHAT_ID, message)
                    .catch(err => console.error('Ошибка Telegram:', err.message));
            }
            
            res.json({ success: true, message: 'Статус обновлён' });
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
        const initialLength = orders.length;
        orders = orders.filter(o => o.id !== orderId);
        
        if (orders.length < initialLength && saveOrders(orders)) {
            res.json({ success: true, message: 'Заявка удалена' });
        } else {
            res.status(404).json({ error: 'Заявка не найдена' });
        }
        
    } catch (error) {
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// Проверка работы API
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'ok',
        timestamp: new Date().toISOString(),
        telegram: !!bot,
        ordersCount: readOrders().length,
        chatClients: chatClients.size
    });
});

// ==================== ЗАПУСК СЕРВЕРА ====================
server.listen(PORT, () => {
    console.log('═══════════════════════════════════════════════');
    console.log('🚀 СЕРВЕР N • PC ЗАПУЩЕН УСПЕШНО!');
    console.log('═══════════════════════════════════════════════');
    console.log(`🌐 Порт: ${PORT}`);
    console.log(`🤖 Telegram бот: ${bot ? 'АКТИВЕН ✅' : 'ОШИБКА ❌'}`);
    console.log(`💬 WebSocket чат: ГОТОВ`);
    console.log(`📊 Заявок в базе: ${readOrders().length}`);
    console.log('═══════════════════════════════════════════════');
    console.log(`📝 Для проверки открой: http://localhost:${PORT}`);
    console.log('═══════════════════════════════════════════════');
});