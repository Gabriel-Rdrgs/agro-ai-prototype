@echo off
TITLE AgroArbitrage AI - Launcher 🚀

echo ==========================================
echo   AGRO-ARBITRAGE AI - INICIANDO SISTEMA
echo ==========================================
echo.

:: 1. Inicia o Backend e IA em modo "Detached" (Background)
echo [1/3] Subindo Containers (Node + Python)...
docker-compose up -d

:: 2. Abre uma janela para ver os logs do Backend (Opcional, bom para dev)
echo [2/3] Abrindo monitor de logs...
start "AgroAI - Logs Backend" cmd /k "docker-compose logs -f --tail=50"

:: 3. Inicia o Frontend em outra janela
echo [3/3] Iniciando Frontend React...
cd frontend
start "AgroAI - Frontend" cmd /k "npm start"

echo.
echo ✅ Tudo pronto! O sistema vai abrir no navegador em instantes.
timeout /t 5
exit