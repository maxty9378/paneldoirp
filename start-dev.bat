@echo off
echo Запуск проекта в режиме разработки...
cd /d "%~dp0"
echo Убедитесь, что очистили кэш браузера (Ctrl+Shift+Del)
echo и отменили регистрацию Service Worker в DevTools
echo.
npm run dev:memory



