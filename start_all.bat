@echo off
echo =========================================
echo  Starting CDN Project Components...
echo =========================================
echo.

echo [1/2] Launching C++ Benchmark in a new window...
start "CDN Simulator" cmd /k "cd files && C:\msys64\mingw64\bin\g++.exe -std=c++17 -O2 -pthread main.cpp -o cdn_benchmark.exe && .\cdn_benchmark.exe"

echo [2/2] Launching React Dashboard in a new window...
start "CDN Dashboard" cmd /k "cd dashboard && npm run dev"

echo.
echo Both components have been successfully launched! 
echo You can now close this window.
