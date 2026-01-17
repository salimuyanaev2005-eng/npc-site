document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('pcBuilderForm');
    const formSteps = document.querySelectorAll('.form-step');
    const progressSteps = document.querySelectorAll('.progress-step');
    const nextButtons = document.querySelectorAll('.next-btn');
    const backButtons = document.querySelectorAll('.back-btn');
    const optionCards = document.querySelectorAll('.option-card');

    let currentStep = 0;

    function updateStep(stepIndex) {
        formSteps.forEach(step => step.classList.remove('active'));
        formSteps[stepIndex].classList.add('active');
        
        progressSteps.forEach((progressStep, index) => {
            progressStep.classList.toggle('active', index <= stepIndex);
        });
        
        currentStep = stepIndex;
        
        // Воспроизводим звук перехода
        if (typeof playClickSound === 'function') {
            playClickSound();
        }
    }

    // Обработчики навигации
    nextButtons.forEach(button => {
        button.addEventListener('click', function() {
            if (validateStep(currentStep)) {
                if (currentStep < formSteps.length - 1) {
                    updateStep(currentStep + 1);
                }
            }
        });
    });

    backButtons.forEach(button => {
        button.addEventListener('click', function() {
            if (typeof playClickSound === 'function') {
                playClickSound();
            }
            
            if (currentStep > 0) {
                updateStep(currentStep - 1);
            }
        });
    });

    // Выбор цели
    optionCards.forEach(card => {
        card.addEventListener('click', function() {
            if (typeof playClickSound === 'function') {
                playClickSound();
            }
            
            optionCards.forEach(c => c.classList.remove('selected'));
            this.classList.add('selected');
            document.getElementById('purpose').value = this.getAttribute('data-value');
        });
    });

    // Валидация шага
    function validateStep(stepIndex) {
        const currentStepElement = formSteps[stepIndex];
        const inputs = currentStepElement.querySelectorAll('input[required], textarea[required]');
        let isValid = true;

        inputs.forEach(input => {
            if (!input.value.trim()) {
                isValid = false;
                input.style.borderColor = '#ff4444';
                
                // Добавляем анимацию "тряски" для ошибки
                input.style.animation = 'shake 0.5s ease-in-out';
                setTimeout(() => {
                    input.style.animation = '';
                }, 500);
            } else {
                input.style.borderColor = '#333333';
            }
        });

        if (stepIndex === 0 && !document.getElementById('purpose').value) {
            isValid = false;
            alert('Пожалуйста, выберите цель использования ПК.');
        }

        return isValid;
    }

    // Функция показа уведомлений
    function showNotification(message, type = 'info') {
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

        // Воспроизводим звук уведомления
        if (typeof playNotificationSound === 'function') {
            playNotificationSound();
        }

        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease-in';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, 4000);
    }

    // Отправка формы на сервер
    form.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const submitBtn = form.querySelector('.submit-btn');
        const originalText = submitBtn.textContent;
        
        try {
            submitBtn.textContent = 'Отправка...';
            submitBtn.disabled = true;

            const formData = new FormData(form);
            const data = Object.fromEntries(formData);
            
            console.log('📤 Отправка данных заявки:', data);
            
            // Проверяем подключение к серверу
            const testResponse = await fetch('/api/test');
            if (!testResponse.ok) {
                throw new Error('Сервер не отвечает');
            }
            
            // Отправляем заявку
            const response = await fetch('/api/orders', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data)
            });

            const result = await response.json();
            
            if (result.success) {
                // Воспроизводим звук успеха
                if (typeof playSuccessSound === 'function') {
                    playSuccessSound();
                }
                
                showNotification('✅ Заявка успешно отправлена! Мы свяжемся с вами в ближайшее время.', 'success');
                
                // Сбрасываем форму
                form.reset();
                optionCards.forEach(card => card.classList.remove('selected'));
                
                // Задержка перед редиректом
                setTimeout(() => {
                    window.location.href = 'index.html';
                }, 2000);
                
            } else {
                throw new Error(result.message || 'Неизвестная ошибка');
            }
            
        } catch (error) {
            console.error('❌ Ошибка отправки заявки:', error);
            showNotification('❌ Произошла ошибка при отправке заявки. Пожалуйста, попробуйте еще раз.', 'error');
            
            // Показываем детали ошибки в консоли
            if (error.message.includes('Failed to fetch')) {
                console.error('⚠️ Проверьте, запущен ли сервер (node server.js)');
            }
        } finally {
            submitBtn.textContent = originalText;
            submitBtn.disabled = false;
        }
    });

    // Добавляем CSS анимации
    const style = document.createElement('style');
    style.textContent = `
        @keyframes shake {
            0%, 100% { transform: translateX(0); }
            25% { transform: translateX(-5px); }
            75% { transform: translateX(5px); }
        }
        
        @keyframes slideIn {
            from { transform: translateX(100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
        }
        
        @keyframes slideOut {
            from { transform: translateX(0); opacity: 1; }
            to { transform: translateX(100%); opacity: 0; }
        }
    `;
    document.head.appendChild(style);

    updateStep(0);
});