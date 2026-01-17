@echo off
chcp 65001
title Установка зависимостей N • PC
color 0A

echo.
echo ═══════════════════════════════════════════════
echo        УСТАНОВКА ЗАВИСИМОСТЕЙ ДЛЯ TELEGRAM
echo ═══════════════════════════════════════════════
echo.

echo 📦 Проверка Node.js...
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Node.js не установлен!
    echo 📥 Скачайте с: https://nodejs.org/
    pause
    exit /b 1
)

echo ✅ Node.js обнаружен
echo.

echo 📦 Установка зависимостей...
echo 1. node-telegram-bot-api...
call npm install node-telegram-bot-api@latest --save

echo.
echo 2. express и ws...
call npm install express@latest ws@latest --save

echo.
echo ✅ Зависимости установлены!
echo.
echo ⚡ Проверка установки...
call npm list --depth=0

echo.
echo 🚀 Теперь запустите сервер: npm start
echo.
pause