@echo off
echo === Building Bangumi Taste Analyzer EXE ===
echo.

:: Step 1: Build Next.js static export (no basePath for local EXE)
echo [1/3] Building static site...
cd /d "%~dp0.."
call npx next build
if %errorlevel% neq 0 (
    echo Build failed!
    pause
    exit /b 1
)

:: Step 2: Copy static files to desktop/www
echo [2/3] Copying static files...
if exist desktop\www rmdir /s /q desktop\www
xcopy /E /I /Q out desktop\www >nul

:: Step 3: Run pkg
echo [3/3] Packaging EXE...
cd desktop
call npx pkg . --compress GZip
if %errorlevel% neq 0 (
    echo Packaging failed!
    pause
    exit /b 1
)

:: Clean up
rmdir /s /q www 2>nul

echo.
echo === Done! ===
echo EXE location: desktop\dist\bangumi-taste-desktop.exe
pause
