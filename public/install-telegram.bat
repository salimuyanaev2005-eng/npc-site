@echo off
chcp 65001
title Установка Telegram бота
color 0A

echo.
echo ═══════════════════════════════════════════════
echo    ПРОСТАЯ УСТАНОВКА TELEGRAM БОТА
echo ═══════════════════════════════════════════════
echo.

echo 📦 Установка модуля Telegram бота...
echo.

npm install node-telegram-bot-api

echo.
echo ✅ Установка завершена!
echo.
echo 🔍 Проверка...
npm list node-telegram-bot-api --depth=0

echo.
echo 🚀 Теперь запустите сервер: npm start
echo.
pause