@echo off
title NetPlex ISP Manager — Setup
color 0A

echo.
echo  ========================================
echo   NetPlex ISP Manager — Auto Setup
echo  ========================================
echo.

:: Check Node.js
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo  [!] Node.js nahi mila. Install kar rahe hain...
    echo  [!] Browser mein ja raha hai — https://nodejs.org
    start https://nodejs.org/en/download
    echo.
    echo  Node.js install karne ke baad ye script dobara chalao.
    pause
    exit
)

echo  [OK] Node.js mila: 
node --version

:: Check PostgreSQL
psql --version >nul 2>&1
if %errorlevel% neq 0 (
    echo.
    echo  [!] PostgreSQL nahi mila.
    echo  [!] Supabase (free online DB) use karein — browser khul raha hai...
    start https://supabase.com
    echo.
    echo  Supabase par:
    echo   1. Free account banao
    echo   2. New project banao
    echo   3. Settings - Database - Connection String copy karo
    echo   4. .env file mein DATABASE_URL mein paste karo
    echo.
    pause
)

:: Setup Backend
echo.
echo  [1/4] Backend setup ho raha hai...
cd /d "%~dp0netplex-dashboard\backend"
copy .env.example .env >nul 2>&1
npm install --silent
echo  [OK] Backend ready

:: Setup Frontend
echo.
echo  [2/4] Frontend setup ho raha hai...
cd /d "%~dp0netplex-dashboard\frontend"
copy .env.example .env >nul 2>&1
npm install --silent
echo  [OK] Frontend ready

:: Create Desktop Shortcut
echo.
echo  [3/4] Desktop shortcut bana raha hai...

set SCRIPT_DIR=%~dp0
set SHORTCUT_PATH=%USERPROFILE%\Desktop\NetPlex Manager.lnk
set TARGET=%~dp0run-netplex.bat

:: Create run script
echo @echo off > "%~dp0run-netplex.bat"
echo title NetPlex ISP Manager >> "%~dp0run-netplex.bat"
echo color 0A >> "%~dp0run-netplex.bat"
echo echo Starting NetPlex Backend... >> "%~dp0run-netplex.bat"
echo start "NetPlex Backend" cmd /k "cd /d %~dp0netplex-dashboard\backend && node src/index.js" >> "%~dp0run-netplex.bat"
echo timeout /t 3 /nobreak ^>nul >> "%~dp0run-netplex.bat"
echo echo Starting NetPlex Frontend... >> "%~dp0run-netplex.bat"
echo start "NetPlex Frontend" cmd /k "cd /d %~dp0netplex-dashboard\frontend && npm run dev" >> "%~dp0run-netplex.bat"
echo timeout /t 4 /nobreak ^>nul >> "%~dp0run-netplex.bat"
echo echo Opening browser... >> "%~dp0run-netplex.bat"
echo start http://localhost:5173 >> "%~dp0run-netplex.bat"
echo echo. >> "%~dp0run-netplex.bat"
echo echo NetPlex chal raha hai! Browser mein check karein. >> "%~dp0run-netplex.bat"

:: Create shortcut using PowerShell
powershell -Command "$ws = New-Object -ComObject WScript.Shell; $s = $ws.CreateShortcut('%SHORTCUT_PATH%'); $s.TargetPath = '%TARGET%'; $s.WorkingDirectory = '%~dp0'; $s.IconLocation = 'shell32.dll,14'; $s.Description = 'NetPlex ISP Manager'; $s.Save()"

echo  [OK] Desktop shortcut ban gaya: "NetPlex Manager"

echo.
echo  [4/4] Pehli baar database setup...
echo.
echo  ============================================
echo   IMPORTANT: Pehle .env file fill karein!
echo  ============================================
echo.
echo  File kholne ke liye Enter dabao:
echo  %~dp0netplex-dashboard\backend\.env
echo.
pause
start notepad "%~dp0netplex-dashboard\backend\.env"

echo.
echo  .env mein ye fields fill karein:
echo  DATABASE_URL=postgresql://user:password@host:5432/netplex
echo  JWT_SECRET=koi_bhi_random_key_likhein (jaise: netplex_secret_2024)
echo.
echo  Fill karne ke baad notepad band karein aur Enter dabao...
pause

:: Try to run schema
echo.
echo  Database tables bana raha hai...
cd /d "%~dp0netplex-dashboard\backend"
for /f "tokens=2 delims==" %%a in ('findstr "DATABASE_URL" .env') do set DB_URL=%%a
if defined DB_URL (
    psql "%DB_URL%" -f src/db/schema.sql >nul 2>&1
    if %errorlevel% equ 0 (echo  [OK] Database tables ban gaye!) else (echo  [!] Database manually setup karna parega — README dekhein)
) else (echo  [!] DATABASE_URL fill nahi hui — .env dobara check karein)

echo.
echo  ========================================
echo   Setup Complete!
echo  ========================================
echo.
echo  Ab kaise chalayein:
echo  - Desktop par "NetPlex Manager" shortcut double-click karein
echo  - Ya seedha chalayein: run-netplex.bat
echo.
echo  Login:
echo  - Username: admin
echo  - Password: admin123 (change karo!)
echo.
pause
start "" "%~dp0run-netplex.bat"
