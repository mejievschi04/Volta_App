#!/bin/bash

echo "========================================"
echo "Setup Baza de Date Volta MySQL"
echo "========================================"
echo ""

# Verifică dacă MySQL este instalat
if ! command -v mysql &> /dev/null; then
    echo "EROARE: MySQL nu este instalat sau nu este în PATH!"
    echo ""
    echo "Alternativ, rulează manual:"
    echo "mysql -u root -p < database.sql"
    exit 1
fi

echo "Introdu datele pentru conectare la MySQL:"
echo ""
read -p "Utilizator MySQL (default: root): " DB_USER
DB_USER=${DB_USER:-root}

read -sp "Parola MySQL: " DB_PASSWORD
echo ""

echo ""
echo "Se conectează la MySQL..."
echo ""

# Rulează scriptul SQL
mysql -u "$DB_USER" -p"$DB_PASSWORD" < database.sql

if [ $? -eq 0 ]; then
    echo ""
    echo "========================================"
    echo "SUCCES! Baza de date a fost creată!"
    echo "========================================"
    echo ""
    echo "Baza de date: volta_db"
    echo "Tabele create: users, notifications, promotions_home, promotions, blog"
    echo ""
else
    echo ""
    echo "========================================"
    echo "EROARE la crearea bazei de date!"
    echo "========================================"
    echo ""
    echo "Verifică:"
    echo "- MySQL este pornit?"
    echo "- Utilizatorul și parola sunt corecte?"
    echo "- Ai permisiuni pentru a crea baze de date?"
    echo ""
fi

