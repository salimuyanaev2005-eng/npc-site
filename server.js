// Обнови форму заявки
document.getElementById('order-form').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const resultDiv = document.getElementById('result');
    resultDiv.innerHTML = '<div style="color: #ffa726;">🔄 Отправка заявки...</div>';
    
    const formData = new FormData(this);
    const data = Object.fromEntries(formData);
    
    try {
        const response = await fetch('/api/orders', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        
        const result = await response.json();
        
        if (result.success) {
            resultDiv.innerHTML = `
                <div style="background: #2e7d32; color: white; padding: 15px; border-radius: 8px;">
                    ✅ Заявка #${result.orderId} отправлена!
                    <p style="margin: 10px 0 0 0; font-size: 14px;">Скоро с вами свяжутся</p>
                </div>
            `;
            this.reset();
        } else {
            resultDiv.innerHTML = `<div style="color: #f44336;">❌ Ошибка: ${result.error || 'Неизвестная ошибка'}</div>`;
        }
    } catch (error) {
        resultDiv.innerHTML = `<div style="color: #f44336;">❌ Ошибка сети: ${error.message}</div>`;
    }
});
