@echo off
REM Folosește UTF-8 pentru afișare (reduce caracterele “stricate”)
chcp 65001 >nul
echo ========================================
echo Setup Baza de Date PostgreSQL - Volta
echo ========================================
echo.

REM Găsește psql.exe (PATH sau locație standard)
set "PSQL_CMD="
for /f "delims=" %%P in ('where psql 2^>nul') do (
    set "PSQL_CMD=%%P"
    goto :psql_found
)
REM IMPORTANT: nu folosim wildcard pe un path complet cu "...\*\bin" (poate să nu se expandeze corect)
for /d %%D in ("C:\Program Files\PostgreSQL\*") do (
    if exist "%%D\bin\psql.exe" (
        set "PSQL_CMD=%%D\bin\psql.exe"
        goto :psql_found
    )
)
for /d %%D in ("C:\Program Files (x86)\PostgreSQL\*") do (
    if exist "%%D\bin\psql.exe" (
        set "PSQL_CMD=%%D\bin\psql.exe"
        goto :psql_found
    )
)
REM Fallback explicit (în cazul tău)
if exist "C:\Program Files\PostgreSQL\18\bin\psql.exe" (
    set "PSQL_CMD=C:\Program Files\PostgreSQL\18\bin\psql.exe"
    goto :psql_found
)

echo ❌ Nu am găsit psql.exe
echo Te rugăm să instalezi PostgreSQL (include "Command Line Tools") sau verifică locația:
echo - C:\Program Files\PostgreSQL\18\bin\psql.exe
pause
exit /b 1

:psql_found
echo ✅ psql găsit: %PSQL_CMD%
echo.

REM Setează variabilele de mediu (modifică aceste valori dacă este necesar)
set DB_HOST=localhost
set DB_PORT=5432
set DB_USER=postgres
set DB_NAME=volta_db

echo Configurație:
echo   Host: %DB_HOST%
echo   Port: %DB_PORT%
echo   User: %DB_USER%
echo   Database: %DB_NAME%
echo.

REM Solicită parola
set /p DB_PASSWORD="Introdu parola pentru utilizatorul %DB_USER%: "
set "PGPASSWORD=%DB_PASSWORD%"

echo.
echo 📦 Creând baza de date...
echo.

REM Creează baza de date
"%PSQL_CMD%" -P pager=off -h %DB_HOST% -p %DB_PORT% -U %DB_USER% -c "CREATE DATABASE %DB_NAME%;" 2>nul
if %ERRORLEVEL% EQU 0 (
    echo ✅ Baza de date creată cu succes!
) else (
    echo ⚠️  Baza de date există deja sau a apărut o eroare.
)

echo.
echo 📋 Rulând script-ul SQL pentru crearea tabelelor...
echo.

REM Rulează script-ul SQL
"%PSQL_CMD%" -P pager=off -h %DB_HOST% -p %DB_PORT% -U %DB_USER% -d %DB_NAME% -f database_postgres.sql

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ✅ Setup completat cu succes!
    echo.
    echo Baza de date %DB_NAME% este gata de utilizare!
) else (
    echo.
    echo ❌ A apărut o eroare la rularea script-ului SQL.
    echo Verifică că toate valorile sunt corecte și că utilizatorul are permisiuni.
)

echo.
pause
