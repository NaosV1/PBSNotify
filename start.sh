#!/bin/bash

# Script de démarrage rapide pour PBS Notify

echo "╔════════════════════════════════════════╗"
echo "║        PBS Notify - Starting           ║"
echo "╚════════════════════════════════════════╝"
echo ""

# Vérifier si Node.js est installé
if ! command -v node &> /dev/null; then
    echo "❌ Node.js n'est pas installé. Installez Node.js 16+ et réessayez."
    exit 1
fi

echo "✓ Node.js version: $(node --version)"

# Vérifier si les dépendances sont installées
if [ ! -d "backend/node_modules" ]; then
    echo ""
    echo "📦 Installation des dépendances backend..."
    cd backend
    npm install
    cd ..
    echo "✓ Dépendances installées"
fi

# Créer les icônes si elles n'existent pas
if [ ! -f "frontend/icon-192.svg" ]; then
    echo ""
    echo "🎨 Création des icônes placeholder..."
    chmod +x create-icons.sh
    ./create-icons.sh
fi

# Vérifier si le fichier .env existe
if [ ! -f "backend/.env" ]; then
    echo ""
    echo "⚠️  Fichier .env non trouvé. Un fichier sera créé au premier lancement."
    echo "   Les clés VAPID seront générées automatiquement."
    echo ""
fi

echo ""
echo "🚀 Démarrage du serveur..."
echo ""

cd backend
npm start
