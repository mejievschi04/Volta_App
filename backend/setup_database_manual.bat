@echo off
echo ========================================
echo Setup Baza de Date Volta MySQL
echo ========================================
echo.
echo Acest script va crea baza de date si tabelele necesare.
echo.
echo OPTIUNI:
echo 1. Daca ai MySQL in PATH, va functiona automat
echo 2. Daca ai MySQL Workbench, deschide database.sql si ruleaza-l
echo 3. Daca ai XAMPP/WAMP, foloseste phpMyAdmin
echo.
echo ========================================
echo.
set /p MYSQL_PATH="Calea catre mysql.exe (sau apasa Enter pentru a incerca automat): "

if "%MYSQL_PATH%"=="" (
    REM Incearca sa gaseasca mysql
    where mysql >nul 2>&1
    if %ERRORLEVEL% EQU 0 (
        set MYSQL_CMD=mysql
    ) else (
        echo.
        echo MySQL nu a fost gasit automat.
        echo.
        echo Te rog sa rulezi manual:
        echo 1. Deschide MySQL Workbench sau phpMyAdmin
        echo 2. Deschide fisierul database.sql
        echo 3. Ruleaza scriptul SQL
        echo.
        pause
        exit /b 1
    )
) else (
    set MYSQL_CMD="%MYSQL_PATH%"
)

echo.
echo Introdu datele pentru conectare la MySQL:
echo.
set /p DB_USER="Utilizator MySQL (default: root): "
if "%DB_USER%"=="" set DB_USER=root

set /p DB_PASSWORD="Parola MySQL: "

echo.
echo Se conecteaza la MySQL...
echo.

REM Ruleaza scriptul SQL
%MYSQL_CMD% -u %DB_USER% -p%DB_PASSWORD% < database.sql

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
    echo.
    echo ALTERNATIVA: Ruleaza manual in MySQL Workbench sau phpMyAdmin
    echo 1. Deschide database.sql
    echo 2. Copiaza continutul
    echo 3. Lipeaste-l in MySQL si ruleaza
    echo.
)

pause











