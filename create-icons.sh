#!/bin/bash

# Script pour créer des icônes placeholder SVG pour la PWA
# Vous pouvez les remplacer par vos propres icônes

cd frontend

# Créer un SVG simple pour les icônes
create_icon() {
    local size=$1
    local filename=$2

    cat > "$filename" << EOF
<svg xmlns="http://www.w3.org/2000/svg" width="$size" height="$size" viewBox="0 0 $size $size">
  <rect width="$size" height="$size" fill="#1e293b"/>
  <text x="50%" y="50%" font-family="Arial, sans-serif" font-size="${size}0%" font-weight="bold" fill="#10b981" text-anchor="middle" dominant-baseline="middle">📦</text>
</svg>
EOF
}

# Créer toutes les tailles d'icônes
echo "Creating PWA icons..."

create_icon 72 "icon-72.svg"
create_icon 96 "icon-96.svg"
create_icon 128 "icon-128.svg"
create_icon 144 "icon-144.svg"
create_icon 152 "icon-152.svg"
create_icon 192 "icon-192.svg"
create_icon 384 "icon-384.svg"
create_icon 512 "icon-512.svg"

# Créer le badge
cat > "badge-72.svg" << 'EOF'
<svg xmlns="http://www.w3.org/2000/svg" width="72" height="72" viewBox="0 0 72 72">
  <rect width="72" height="72" rx="12" fill="#10b981"/>
  <text x="36" y="48" font-family="Arial, sans-serif" font-size="40" font-weight="bold" fill="white" text-anchor="middle">!</text>
</svg>
EOF

echo "✓ SVG icons created in frontend/"
echo ""
echo "Note: Ces icônes SVG fonctionnent dans la plupart des navigateurs modernes."
echo "Pour de meilleures performances, convertissez-les en PNG avec ImageMagick:"
echo ""
echo "  for file in icon-*.svg; do"
echo "    convert \$file \${file%.svg}.png"
echo "  done"
echo ""
echo "Ou utilisez un outil en ligne comme https://realfavicongenerator.net/"
