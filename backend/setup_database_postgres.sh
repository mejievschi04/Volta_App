#!/bin/bash

echo "========================================"
echo "Setup Baza de Date PostgreSQL - Volta"
echo "========================================"
echo ""

# Verifică dacă PostgreSQL este instalat
if ! command -v psql &> /dev/null; then
    echo "❌ PostgreSQL nu este instalat sau nu este în PATH!"
    echo "Te rugăm să instalezi PostgreSQL."
    exit 1
fi

echo "✅ PostgreSQL găsit!"
echo ""

# Setează variabilele de mediu (modifică aceste valori dacă este necesar)
DB_HOST=${DB_HOST:-localhost}
DB_PORT=${DB_PORT:-5432}
DB_USER=${DB_USER:-postgres}
DB_NAME=${DB_NAME:-volta_db}

echo "Configurație:"
echo "  Host: $DB_HOST"
echo "  Port: $DB_PORT"
echo "  User: $DB_USER"
echo "  Database: $DB_NAME"
echo ""

# Solicită parola
read -sp "Introdu parola pentru utilizatorul $DB_USER: " DB_PASSWORD
echo ""

echo "📦 Creând baza de date..."
echo ""

# Creează baza de date
PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -c "CREATE DATABASE $DB_NAME;" 2>/dev/null
if [ $? -eq 0 ]; then
    echo "✅ Baza de date creată cu succes!"
else
    echo "⚠️  Baza de date există deja sau a apărut o eroare."
fi

echo ""
echo "📋 Rulând script-ul SQL pentru crearea tabelelor..."
echo ""

# Rulează script-ul SQL
PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -f database_postgres.sql

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Setup completat cu succes!"
    echo ""
    echo "Baza de date $DB_NAME este gata de utilizare!"
else
    echo ""
    echo "❌ A apărut o eroare la rularea script-ului SQL."
    echo "Verifică că toate valorile sunt corecte și că utilizatorul are permisiuni."
fi
