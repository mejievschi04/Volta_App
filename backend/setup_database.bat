@echo off
echo ========================================
echo Setup Baza de Date Volta MySQL
echo ========================================
echo.

REM Verifică dacă MySQL este în PATH
where mysql >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo EROARE: MySQL nu este în PATH!
    echo Asigura-te ca MySQL este instalat si adaugat la PATH.
    echo.
    echo Alternativ, ruleaza manual:
    echo mysql -u root -p ^< database.sql
    pause
    exit /b 1
)

echo Introdu datele pentru conectare la MySQL:
echo.
set /p DB_USER="Utilizator MySQL (default: root): "
if "%DB_USER%"=="" set DB_USER=root

set /p DB_PASSWORD="Parola MySQL: "

echo.
echo Se conecteaza la MySQL...
echo.

REM Rulează scriptul SQL
mysql -u %DB_USER% -p%DB_PASSWORD% < database.sql

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ========================================
    echo SUCCES! Baza de date a fost creata!
    echo ========================================
    echo.
    echo Baza de date: volta_db
    echo Tabele create: users, notifications, promotions_home, promotions, blog
    echo.
) else (
    echo.
    echo ========================================
    echo EROARE la crearea bazei de date!
    echo ========================================
    echo.
    echo Verifica:
    echo - MySQL este pornit?
    echo - Utilizatorul si parola sunt corecte?
    echo - Ai permisiuni pentru a crea baze de date?
    echo.
)

pause

