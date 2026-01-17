// Простые звуки для сайта (упрощенная версия)
class SoundManager {
    constructor() {
        this.enabled = true;
        this.audioContext = null;
        this.init();
    }

    init() {
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        } catch (error) {
            console.log('Звуки отключены - браузер не поддерживает Web Audio API');
            this.enabled = false;
        }
    }

    playBeep(frequency = 440, duration = 0.1, volume = 0.1) {
        if (!this.enabled || !this.audioContext) return;
        
        try {
            const oscillator = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(this.audioContext.destination);
            
            oscillator.frequency.value = frequency;
            oscillator.type = 'sine';
            
            gainNode.gain.setValueAtTime(volume, this.audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + duration);
            
            oscillator.start(this.audioContext.currentTime);
            oscillator.stop(this.audioContext.currentTime + duration);
        } catch (error) {
            // Игнорируем ошибки звуков
        }
    }
}

// Создаем глобальный менеджер звуков
const soundManager = new SoundManager();

// Функции для использования в других файлах
function playSuccessSound() {
    soundManager.playBeep(523.25, 0.3); // До
}

function playClickSound() {
    soundManager.playBeep(400, 0.05); // Короткий клик
}

function playNotificationSound() {
    soundManager.playBeep(784, 0.2); // Соль
    setTimeout(() => soundManager.playBeep(1046, 0.2), 100); // До через 100мс
}

function playTransitionSound() {
    soundManager.playBeep(300, 0.4); // Плавный переход
}