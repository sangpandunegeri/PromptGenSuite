@echo off
cd /d D:\projectku

:: Jalankan npm run dev di window baru
start cmd /k "npm run dev"

:: Tunggu sebentar biar server siap
timeout /t 3 /nobreak >nul

:: Buka browser ke localhost:5173
start http://localhost:5173/
