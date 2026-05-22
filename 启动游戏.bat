@echo off
chcp 65001 >nul
title 无限数域

echo 启动《无限数域》游戏服务...
start "" /MIN C:\Users\mi\.workbuddy\binaries\python\versions\3.13.12\python.exe -m http.server 8080 --bind 0.0.0.0

echo 等待服务就绪...
:loop
timeout /t 1 /nobreak >nul
powershell -Command "try { Invoke-WebRequest 'http://localhost:8080' -UseBasicParsing -TimeoutSec 2 | Out-Null; exit 0 } catch { exit 1 }" >nul 2>&1
if errorlevel 1 goto loop

echo 启动游戏窗口...
start "" msedge --app=http://localhost:8080 --window-size=1100,750

echo 游戏已启动！
exit
