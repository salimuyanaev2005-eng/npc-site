class AdminPanel {
    constructor() {
        this.orders = [];
        this.filteredOrders = [];
        this.currentFilter = 'all';
        this.searchTerm = '';
        this.lastUpdate = null;
        this.errorCount = 0;
        this.maxErrors = 3;
        this.init();
    }

    async init() {
        await this.loadOrders();
        this.setupEventListeners();
        this.startAutoRefresh();
    }

    async loadOrders() {
        try {
            console.log('🔄 Загрузка заявок...');
            const response = await fetch('/api/orders');
            
            if (!response.ok) {
                throw new Error(`HTTP ошибка! статус: ${response.status}`);
            }
            
            const orders = await response.json();
            
            console.log(`✅ Загружено заявок: ${orders.length}`);
            this.orders = orders;
            this.applyFilters();
            this.updateStats();
            this.errorCount = 0;
            
        } catch (error) {
            console.error('❌ Ошибка загрузки заявок:', error);
            this.errorCount++;
            
            if (this.errorCount <= this.maxErrors) {
                console.log(`🔄 Попытка ${this.errorCount}/${this.maxErrors}`);
                // Показываем сообщение об ошибке
                this.showMessage(`Ошибка загрузки заявок. Попытка ${this.errorCount}/${this.maxErrors}`, 'error');
            } else {
                this.showMessage('Не удалось загрузить заявки. Проверьте подключение к серверу.', 'error');
            }
        }
    }

    applyFilters() {
        let filtered = this.orders;

        if (this.currentFilter !== 'all') {
            filtered = filtered.filter(order => order.status === this.currentFilter);
        }

        if (this.searchTerm) {
            const term = this.searchTerm.toLowerCase();
            filtered = filtered.filter(order => 
                order.name.toLowerCase().includes(term) ||
                order.email.toLowerCase().includes(term) ||
                order.phone.toLowerCase().includes(term) ||
                order.purpose.toLowerCase().includes(term)
            );
        }

        filtered.sort((a, b) => new Date(b.date) - new Date(a.date));

        this.filteredOrders = filtered;
        this.renderOrders();
    }

    renderOrders() {
        const ordersList = document.getElementById('orders-list');
        
        if (this.filteredOrders.length === 0) {
            const noOrdersText = this.orders.length === 0 ? 
                'Заявок пока нет' : 'Заявки не найдены по текущему фильтру';
            ordersList.innerHTML = `<div class="no-orders">${noOrdersText}</div>`;
            return;
        }

        ordersList.innerHTML = this.filteredOrders.map(order => `
            <div class="order-row" data-order-id="${order.id}">
                <div>
                    <strong>#${order.id}</strong>
                </div>
                <div>
                    <div><strong>${order.name}</strong></div>
                    <div style="color: #cccccc; font-size: 0.9rem;">${order.email}</div>
                    <div style="color: #cccccc; font-size: 0.9rem;">${order.phone}</div>
                </div>
                <div>
                    <div style="margin-bottom: 0.3rem;">${order.purpose}</div>
                    <div style="color: #ffa726; font-weight: bold;">${this.formatBudget(order.budget)}</div>
                </div>
                <div>
                    <span class="status-badge status-${order.status}">
                        ${this.getStatusText(order.status)}
                    </span>
                    <select class="status-select" onchange="admin.updateStatus(${order.id}, this.value)" style="margin-top: 0.3rem;">
                        <option value="new" ${order.status === 'new' ? 'selected' : ''}>Новая</option>
                        <option value="in-progress" ${order.status === 'in-progress' ? 'selected' : ''}>В работе</option>
                        <option value="completed" ${order.status === 'completed' ? 'selected' : ''}>Завершена</option>
                    </select>
                </div>
                <div>
                    ${order.date}
                </div>
                <div>
                    <div class="action-buttons">
                        <button class="action-btn view" onclick="admin.showDetails(${order.id})">
                            👁️ Подробно
                        </button>
                        <button class="action-btn delete" onclick="admin.deleteOrder(${order.id})">
                            🗑️ Удалить
                        </button>
                    </div>
                </div>
            </div>
        `).join('');
    }

    formatBudget(budget) {
        const budgetNum = parseInt(budget);
        return isNaN(budgetNum) ? '0 ₽' : budgetNum.toLocaleString('ru-RU') + ' ₽';
    }

    updateStats() {
        const total = this.orders.length;
        const newOrders = this.orders.filter(o => o.status === 'new').length;
        const progressOrders = this.orders.filter(o => o.status === 'in-progress').length;
        const completedOrders = this.orders.filter(o => o.status === 'completed').length;

        const totalBudget = this.orders.reduce((sum, order) => {
            return sum + (parseInt(order.budget) || 0);
        }, 0);

        document.getElementById('total-orders').textContent = total;
        document.getElementById('new-orders').textContent = newOrders;
        document.getElementById('progress-orders').textContent = progressOrders;
        document.getElementById('completed-orders').textContent = completedOrders;
        document.getElementById('total-budget').textContent = this.formatBudget(totalBudget);

        this.lastUpdate = new Date();
    }

    async updateStatus(orderId, newStatus) {
        try {
            console.log(`🔄 Обновление статуса заявки #${orderId} на ${newStatus}`);
            const response = await fetch(`/api/orders/${orderId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ status: newStatus })
            });

            const result = await response.json();
            
            if (result.success) {
                if (typeof playNotificationSound === 'function') {
                    playNotificationSound();
                }
                this.showMessage('Статус обновлен', 'success');
                await this.loadOrders();
            } else {
                throw new Error(result.message);
            }
        } catch (error) {
            console.error('❌ Ошибка обновления статуса:', error);
            this.showMessage('Ошибка обновления статуса', 'error');
        }
    }

    async deleteOrder(orderId) {
        if (!confirm('Вы уверены, что хотите удалить эту заявку?')) return;

        try {
            console.log(`🗑️ Удаление заявки #${orderId}`);
            const response = await fetch(`/api/orders/${orderId}`, {
                method: 'DELETE'
            });

            const result = await response.json();
            
            if (result.success) {
                if (typeof playNotificationSound === 'function') {
                    playNotificationSound();
                }
                this.showMessage('Заявка удалена', 'success');
                await this.loadOrders();
            } else {
                throw new Error(result.message);
            }
        } catch (error) {
            console.error('❌ Ошибка удаления заявки:', error);
            this.showMessage('Ошибка удаления заявки', 'error');
        }
    }

    filterOrders(status) {
        this.currentFilter = status;
        
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        event.target.classList.add('active');
        
        this.applyFilters();
    }

    searchOrders(term) {
        this.searchTerm = term;
        this.applyFilters();
    }

    showDetails(orderId) {
        const order = this.orders.find(o => o.id === orderId);
        if (!order) return;

        const modal = document.getElementById('order-details-modal');
        const content = document.getElementById('order-details-content');

        content.innerHTML = `
            <div class="detail-grid">
                <div class="detail-item">
                    <div class="detail-label">Статус</div>
                    <div class="detail-value">
                        <span class="status-badge status-${order.status}">
                            ${this.getStatusText(order.status)}
                        </span>
                    </div>
                </div>
                
                <div class="detail-item">
                    <div class="detail-label">ID заявки</div>
                    <div class="detail-value">#${order.id}</div>
                </div>

                <div class="detail-item">
                    <div class="detail-label">Имя клиента</div>
                    <div class="detail-value">${order.name}</div>
                </div>

                <div class="detail-item">
                    <div class="detail-label">Email</div>
                    <div class="detail-value">${order.email}</div>
                </div>

                <div class="detail-item">
                    <div class="detail-label">Телефон</div>
                    <div class="detail-value">${order.phone}</div>
                </div>

                <div class="detail-item">
                    <div class="detail-label">Цель сборки</div>
                    <div class="detail-value">${order.purpose}</div>
                </div>

                <div class="detail-item">
                    <div class="detail-label">Бюджет</div>
                    <div class="detail-value" style="color: #ffa726; font-weight: bold;">
                        ${this.formatBudget(order.budget)}
                    </div>
                </div>

                <div class="detail-item detail-full">
                    <div class="detail-label">Пожелания к компонентам</div>
                    <div class="detail-value">${order.components || 'Не указано'}</div>
                </div>

                <div class="detail-item detail-full">
                    <div class="detail-label">Комментарий</div>
                    <div class="detail-value">${order.comment || 'Не указано'}</div>
                </div>

                <div class="detail-item">
                    <div class="detail-label">Дата заявки</div>
                    <div class="detail-value">${order.date}</div>
                </div>
            </div>

            <div style="margin-top: 2rem; display: flex; gap: 1rem;">
                <button class="action-btn" onclick="admin.updateStatus(${order.id}, 'in-progress')">
                    📋 В работу
                </button>
                <button class="action-btn" onclick="admin.updateStatus(${order.id}, 'completed')">
                    ✅ Завершить
                </button>
                <button class="action-btn delete" onclick="admin.deleteOrder(${order.id})">
                    🗑️ Удалить
                </button>
            </div>
        `;

        modal.style.display = 'flex';
    }

    closeModal() {
        document.getElementById('order-details-modal').style.display = 'none';
    }

    exportToJSON() {
        const dataStr = JSON.stringify(this.orders, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        this.downloadFile(dataBlob, `npc-orders-${new Date().toISOString().split('T')[0]}.json`);
        this.showMessage('Данные экспортированы в JSON', 'success');
    }

    exportToCSV() {
        const headers = ['ID', 'Имя', 'Email', 'Телефон', 'Цель', 'Бюджет', 'Статус', 'Дата', 'Компоненты', 'Комментарий'];
        const csvData = this.orders.map(order => [
            order.id,
            `"${order.name}"`,
            `"${order.email}"`,
            `"${order.phone}"`,
            `"${order.purpose}"`,
            order.budget,
            `"${this.getStatusText(order.status)}"`,
            `"${order.date}"`,
            `"${order.components || ''}"`,
            `"${order.comment || ''}"`
        ].join(','));

        const csv = [headers.join(','), ...csvData].join('\n');
        const dataBlob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        this.downloadFile(dataBlob, `npc-orders-${new Date().toISOString().split('T')[0]}.csv`);
        this.showMessage('Данные экспортированы в CSV', 'success');
    }

    downloadFile(blob, filename) {
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = filename;
        link.click();
        URL.revokeObjectURL(link.href);
    }

    async clearCompleted() {
        if (!confirm('Удалить все завершённые заявки? Это действие нельзя отменить.')) return;

        try {
            const completedOrders = this.orders.filter(order => order.status === 'completed');
            
            for (const order of completedOrders) {
                await fetch(`/api/orders/${order.id}`, {
                    method: 'DELETE'
                });
            }

            this.showMessage(`Удалено ${completedOrders.length} завершённых заявок`, 'success');
            await this.loadOrders();
        } catch (error) {
            console.error('❌ Ошибка:', error);
            this.showMessage('Ошибка удаления заявок', 'error');
        }
    }

    getStatusText(status) {
        const statusMap = {
            'new': 'Новая',
            'in-progress': 'В работе',
            'completed': 'Завершена'
        };
        return statusMap[status] || status;
    }

    showMessage(message, type = 'info') {
        if (typeof playNotificationSound === 'function') {
            playNotificationSound();
        }
        
        const notification = document.createElement('div');
        notification.textContent = message;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 1rem 1.5rem;
            border-radius: 6px;
            color: white;
            font-weight: bold;
            z-index: 10000;
            animation: slideIn 0.3s ease-out;
            ${type === 'success' ? 'background: #66bb6a;' : ''}
            ${type === 'error' ? 'background: #f44336;' : ''}
            ${type === 'info' ? 'background: #2196f3;' : ''}
        `;

        document.body.appendChild(notification);

        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease-in';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, 3000);
    }

    startAutoRefresh() {
        // Обновляем каждые 30 секунд
        setInterval(() => {
            this.loadOrders();
        }, 30000);
    }

    setupEventListeners() {
        document.getElementById('order-details-modal').addEventListener('click', (e) => {
            if (e.target.id === 'order-details-modal') {
                this.closeModal();
            }
        });

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeModal();
            }
        });

        // При фокусе на окно обновляем заявки
        window.addEventListener('focus', () => {
            this.loadOrders();
        });
    }
}

const admin = new AdminPanel();

// Глобальные функции
function loadOrders() {
    admin.loadOrders();
}