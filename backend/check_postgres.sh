#!/bin/bash

echo "========================================"
echo "Verificare PostgreSQL"
echo "========================================"
echo ""

# Verifică dacă PostgreSQL este instalat
if ! command -v psql &> /dev/null; then
    echo "❌ PostgreSQL nu este instalat sau nu este în PATH!"
    echo ""
    echo "Pentru a instala PostgreSQL:"
    echo "  Mac: brew install postgresql@14"
    echo "  Linux: sudo apt-get install postgresql"
    echo ""
    exit 1
fi

echo "✅ PostgreSQL este instalat!"
echo ""

# Verifică dacă serviciul rulează (Linux)
if command -v systemctl &> /dev/null; then
    if systemctl is-active --quiet postgresql; then
        echo "✅ Serviciul PostgreSQL rulează!"
    else
        echo "⚠️  Serviciul PostgreSQL nu rulează!"
        echo "   Pornește cu: sudo systemctl start postgresql"
    fi
    echo ""
fi

# Mac - verifică cu brew services
if [[ "$OSTYPE" == "darwin"* ]]; then
    if brew services list | grep -q "postgresql.*started"; then
        echo "✅ PostgreSQL rulează (brew services)!"
    else
        echo "⚠️  PostgreSQL nu rulează!"
        echo "   Pornește cu: brew services start postgresql@14"
    fi
    echo ""
fi

# Încearcă să se conecteze
echo "Încearcă să se conecteze la PostgreSQL..."
echo ""

read -p "Utilizator (default: postgres): " DB_USER
DB_USER=${DB_USER:-postgres}

read -sp "Parolă: " DB_PASSWORD
echo ""

PGPASSWORD=$DB_PASSWORD psql -U $DB_USER -c "SELECT version();" 2>/dev/null
if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Conexiune reușită!"
    echo ""
    echo "PostgreSQL este configurat corect!"
else
    echo ""
    echo "❌ Nu s-a putut conecta la PostgreSQL!"
    echo ""
    echo "Verifică:"
    echo "  1. Serviciul PostgreSQL rulează"
    echo "  2. Parola este corectă"
    echo "  3. Utilizatorul există"
    echo ""
fi
