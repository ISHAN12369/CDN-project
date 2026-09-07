@echo off
setlocal enabledelayedexpansion
title CDN Core Simulator - Launcher
color 0A

echo ================================================================
echo       CDN CORE // HIGH-PERFORMANCE DISTRIBUTED CACHE
echo ================================================================
echo.

:: 1. Locate C++ Compiler
echo [1/3] Detecting C++17 compiler...
set GXX_CMD=
where g++ >nul 2>&1
if %ERRORLEVEL% equ 0 (
    set GXX_CMD=g++
    echo   Found g++ in system PATH.
) else if exist "C:\msys64\mingw64\bin\g++.exe" (
    set GXX_CMD="C:\msys64\mingw64\bin\g++.exe"
    echo   Found g++ in C:\msys64\mingw64\bin\
) else if exist "C:\msys64\ucrt64\bin\g++.exe" (
    set GXX_CMD="C:\msys64\ucrt64\bin\g++.exe"
    echo   Found g++ in C:\msys64\ucrt64\bin\
) else if exist "C:\MinGW\bin\g++.exe" (
    set GXX_CMD="C:\MinGW\bin\g++.exe"
    echo   Found g++ in C:\MinGW\bin\
) else (
    echo   [!] Warning: g++ not found automatically. Please ensure MinGW/GCC is installed.
    set GXX_CMD=g++
)

:: 2. Compile & Run C++ Benchmark in separate window
echo [2/3] Launching C++ Benchmark Engine...
start "CDN Simulator // C++17 Core" cmd /k "cd /d "%~dp0files" && if not exist results mkdir results && echo Compiling C++ Core Engine... && %GXX_CMD% -std=c++17 -O2 -pthread main.cpp -o cdn_benchmark.exe && echo Running Benchmark Simulation... && .\cdn_benchmark.exe && echo. && echo Benchmark complete! Output saved to results/benchmark.csv"

:: 3. Launch React Dashboard & Open Browser
echo [3/3] Launching React Dashboard...
if not exist "%~dp0dashboard\node_modules" (
    echo   node_modules missing, installing dependencies...
    cd /d "%~dp0dashboard"
    call npm install
)

start "CDN Dashboard // React Vite" cmd /k "cd /d "%~dp0dashboard" && npm run dev"

:: Open Browser automatically
timeout /t 2 /nobreak >nul
echo.
echo Opening Dashboard in your default browser: http://localhost:5173/
start http://localhost:5173/

echo.
echo ================================================================
echo   All systems running! 
echo   - C++ Engine Benchmark running in dedicated console
echo   - Interactive Dashboard running at http://localhost:5173/
echo ================================================================
echo.
pause
