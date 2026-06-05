@echo off
chcp 65001 >nul
echo ==============================
echo  无限数域 APK 构建脚本
echo ==============================

REM ---- 设置 JDK 路径（使用 Windows 短路径名绕过 + 号问题）----
for /f "delims=" %%i in ('powershell -Command "(Get-Item ''C:\Users\mi\jdk-21\jdk-21.0.11+10'').ShortPath"') do set JAVA_HOME=%%i

echo [1/5] JAVA_HOME 设置为：%JAVA_HOME%
if not exist "%JAVA_HOME%\bin\java.exe" (
  echo ❌ 错误：找不到 java.exe，请检查 JDK 路径！
  pause
  exit /b 1
)

REM ---- 设置 Android SDK 路径 ----
set ANDROID_SDK_ROOT=C:\Users\mi\android-sdk
echo [2/5] ANDROID_SDK_ROOT 设置为：%ANDROID_SDK_ROOT%

REM ---- 设置 PATH ----
set PATH=%JAVA_HOME%\bin;%ANDROID_SDK_ROOT%\cmdline-tools\latest\bin;%PATH%

REM ---- 验证 Java ----
echo [3/5] 验证 Java 版本...
java -version
if errorlevel 1 (
  echo ❌ Java 验证失败！
  pause
  exit /b 1
)

REM ---- 进入 android 目录 ----
cd /d "D:\整理_个人\workspace\2026-05-17-task-1\infinite_numeral\android"
if errorlevel 1 (
  echo ❌ 无法进入 android 目录！
  pause
  exit /b 1
)

REM ---- 清理旧构建 ----
echo [4/5] 清理旧构建...
call gradlew.bat clean --no-daemon 2>&1 | tail -20

REM ---- 开始构建 ----
echo [5/5] 开始构建 APK（--no-daemon 模式）...
echo 构建日志将保存到 build.log
call gradlew.bat assembleDebug --no-daemon --info 2>&1 | tee build.log

if exist "app\build\outputs\apk\debug\app-debug.apk" (
  echo.
  echo ==============================
  echo ✅ APK 构建成功！
  echo 路径：%CD%\app\build\outputs\apk\debug\app-debug.apk
  echo ==============================
) else (
  echo.
  echo ❌ APK 构建失败，请查看 build.log
)

pause
