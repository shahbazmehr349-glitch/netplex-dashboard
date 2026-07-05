@echo off
title NetPlex ISP Manager
color 0A

echo.
echo  ==============================
echo   NetPlex ISP Manager
echo  ==============================
echo.
echo  Starting servers...
echo.

:: Start Backend
start "NetPlex Backend" cmd /k "cd /d %~dp0netplex-dashboard\backend && node src/index.js"

:: Wait 3 seconds
timeout /t 3 /nobreak >nul

:: Start Frontend
start "NetPlex Frontend" cmd /k "cd /d %~dp0netplex-dashboard\frontend && npm run dev"

:: Wait 4 seconds then open browser
timeout /t 4 /nobreak >nul

echo  Backend aur Frontend chal rahe hain!
echo  Browser mein khul raha hai...
echo.

start http://localhost:5173

echo  Login: admin / admin123
echo.
echo  Band karne ke liye: dono cmd windows band karein.
echo.
pause
