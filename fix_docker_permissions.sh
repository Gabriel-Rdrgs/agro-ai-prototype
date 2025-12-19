#!/bin/bash

# Script para corrigir permissões do Docker
# Execute: ./fix_docker_permissions.sh

echo "🔧 Corrigindo Permissões do Docker"
echo "==================================="
echo ""

# Verificar se o usuário já está no grupo docker
if groups | grep -q docker; then
    echo "✅ Você já está no grupo docker!"
    echo "   Tente fechar e reabrir o terminal."
    exit 0
fi

echo "⚠️ Você não está no grupo docker."
echo ""
echo "Para corrigir, execute no terminal:"
echo ""
echo "  sudo usermod -aG docker \$USER"
echo ""
echo "Depois:"
echo "  1. FECHE TODOS os terminais"
echo "  2. Reabra um novo terminal"
echo "  3. Execute: docker ps (para testar)"
echo ""
echo "Ou use sudo temporariamente:"
echo "  sudo docker compose up"
echo ""





