@echo off
chcp 65001 >nul
setlocal EnableDelayedExpansion

echo ===========================

echo   《无限数域》APK 构建脚本
echo ===========================

echo.

REM ===========================

REM  Step 1：设置 JDK 路径
REM ===========================

echo [1/7] 设置 JAVA_HOME...

set "JAVA_HOME=C:\Users\mi\jdk-21\jdk-21.0.11+10"

if not exist "%JAVA_HOME%\bin\java.exe" (
    echo ❌ 错误：找不到 java.exe
    echo 路径：%JAVA_HOME%
    echo.
    echo 请用压缩软件打开 C:\Users\mi\jdk-21\ 目录
    echo 手动重命名文件夹：把 "jdk-21.0.11+10" 改成 "jdk-21.0.11_10"
    echo 然后编辑此脚本，把 JAVA_HOME 改为新路径
    pause
    exit /b 1
)

echo ✅ JAVA_HOME = %JAVA_HOME%
"%JAVA_HOME%\bin\java.exe" -version 2>&1 | findstr /i "version"

REM ===========================

REM  Step 2：设置 Android SDK 路径
REM ===========================

echo.
echo [2/7] 设置 ANDROID_SDK_ROOT...
set "ANDROID_SDK_ROOT=C:\Users\mi\android-sdk"
if not exist "%ANDROID_SDK_ROOT%\cmdline-tools\latest\bin\sdkmanager.bat" (
    echo ❌ 错误：找不到 Android SDK
    echo 路径：%ANDROID_SDK_ROOT%
    pause
    exit /b 1
)
echo ✅ ANDROID_SDK_ROOT = %ANDROID_SDK_ROOT%

REM ===========================

REM  Step 3：设置环境变量
REM ===========================

echo.
echo [3/7] 设置 PATH 和 GRADLE_OPTS...
set "PATH=%JAVA_HOME%\bin;%ANDROID_SDK_ROOT%\cmdline-tools\latest\bin;%ANDROID_SDK_ROOT%\platform-tools;%PATH%"

REM 设置 Gradle 内存（避免卡死）
set "GRADLE_OPTS=-Xmx4096m -XX:MaxMetaspaceSize=1024m -Dfile.encoding=UTF-8"

echo ✅ 环境变量设置完成
echo    GRADLE_OPTS = %GRADLE_OPTS%

REM ===========================

REM  Step 4：进入 android 目录
REM ===========================

echo.
echo [4/7] 进入 android 目录...
cd /d "D:\整理_个人\workspace\2026-05-17-task-1\infinite_numeral\android"
if errorlevel 1 (
    echo ❌ 错误：无法进入 android 目录！
    echo 路径：D:\整理_个人\workspace\2026-05-17-task-1\infinite_numeral\android
    pause
    exit /b 1
)
echo ✅ 当前目录：%CD%

REM ===========================

REM  Step 5：清理旧构建
REM ===========================

echo.
echo [5/7] 清理旧构建...
call gradlew.bat clean --no-daemon 2>&1 | findstr /i /r "BUILD\|SUCCESS\|FAILED\|error" 
if errorlevel 1 (
    echo ⚠️  清理步骤可能有警告（可忽略）
) else (
    echo ✅ 清理完成
)

REM ===========================

REM  Step 6：开始构建 APK
REM ===========================

echo.
echo [6/7] 开始构建 APK...
echo ===========================

echo 提示：
echo   - 使用 --no-daemon 模式（避免卡死）
echo   - 使用 --info 显示详细日志
echo   - 构建日志将保存到 build.log
echo ===========================

echo.
echo 构建开始时间：%TIME%
echo.

REM 启动构建（输出到日志文件，同时显示在屏幕）
call gradlew.bat assembleDebug --no-daemon --info --stacktrace > build.log 2>&1

echo.
echo 构建结束时间：%TIME%

REM ===========================

REM  Step 7：检查构建结果
REM ===========================

echo.
echo [7/7] 检查构建结果...
echo ===========================

if exist "app\build\outputs\apk\debug\app-debug.apk" (
    echo ===========================

    echo ✅ APK 构建成功！
    echo ===========================

    echo.
    echo APK 路径：
    echo   %CD%\app\build\outputs\apk\debug\app-debug.apk
    echo.
    echo 文件大小：
    dir "app\build\outputs\apk\debug\app-debug.apk" | findstr /i "app-debug.apk"
    echo.
    echo ===========================

    echo 构建日志已保存到：
    echo   %CD%\build.log
    echo ===========================

    
    REM 打开 APK 所在文件夹
    start "" "app\build\outputs\apk\debug"
) else (
    echo ===========================

    echo ❌ APK 构建失败！
    echo ===========================

    echo.
    echo 可能原因：
    echo   1. Gradle 守护进程卡死（已使用 --no-daemon 避免）
    echo   2. 内存不足（已设置 -Xmx4096m）
    echo   3. JDK 版本不匹配（需要 JDK 21）
    echo   4. Android SDK 缺少依赖
    echo.
    echo 请查看构建日志（最后 50 行）：
    echo ===========================

    powershell -Command "Get-Content 'build.log' -Tail 50"
)

echo.
pause
