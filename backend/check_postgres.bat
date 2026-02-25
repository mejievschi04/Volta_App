@echo off
REM Folosește UTF-8 pentru afișare (reduce caracterele “stricate”)
chcp 65001 >nul
echo ========================================
echo Verificare PostgreSQL
echo ========================================
echo.

REM Verifică dacă PostgreSQL este instalat / psql este disponibil
set "PSQL_CMD="
for /f "delims=" %%P in ('where psql 2^>nul') do (
    set "PSQL_CMD=%%P"
    goto :psql_found
)

REM Dacă psql nu este în PATH, încearcă foldere standard de instalare
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
for /d %%D in ("C:\PostgreSQL\*") do (
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
echo.
echo Cel mai probabil PostgreSQL nu este în PATH sau nu este instalat complet.
echo.
echo Verifică dacă există:
echo - C:\Program Files\PostgreSQL\XX\bin\psql.exe
echo - C:\Program Files ^(x86^)\PostgreSQL\XX\bin\psql.exe
echo.
echo Dacă nu există deloc psql.exe, la instalarea PostgreSQL bifează componenta:
echo - "Command Line Tools"
echo Dacă există, adaugă folderul ...\bin în PATH și redeschide terminalul.
echo.
echo Instalare: https://www.postgresql.org/download/windows/
echo.
pause
exit /b 1

:psql_found
echo ✅ psql găsit: %PSQL_CMD%
echo.

REM Verifică dacă serviciul rulează (fără wildcard - sc nu suportă *)
echo Servicii PostgreSQL găsite (dacă există):
sc query state^= all | findstr /I "SERVICE_NAME: postgresql" >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    sc query state^= all | findstr /I "SERVICE_NAME: postgresql"
    echo.
    echo Deschide Services (services.msc) și verifică dacă este RUNNING.
    echo.
) else (
    echo ⚠️  Nu am detectat serviciul PostgreSQL prin sc.
    echo Verifică manual în Services (services.msc) și caută "PostgreSQL".
    echo.
)

REM Încearcă să se conecteze
echo Încearcă să se conecteze la PostgreSQL...
echo.

set /p DB_USER="Utilizator (default: postgres): "
if "%DB_USER%"=="" set DB_USER=postgres

set /p DB_PASSWORD="Parolă: "

set "PGPASSWORD=%DB_PASSWORD%"
"%PSQL_CMD%" -P pager=off -h localhost -p 5432 -U %DB_USER% -c "SELECT version();" 2>nul
if %ERRORLEVEL% EQU 0 (
    echo.
    echo ✅ Conexiune reușită!
    echo.
    echo PostgreSQL este configurat corect!
) else (
    echo.
    echo ❌ Nu s-a putut conecta la PostgreSQL!
    echo.
    echo Verifică:
    echo 1. Serviciul PostgreSQL rulează (Services > PostgreSQL)
    echo 2. Portul 5432 este corect (dacă ai alt port, schimbă în .env)
    echo 3. Parola este corectă
    echo 4. Utilizatorul există
    echo.
)

pause
