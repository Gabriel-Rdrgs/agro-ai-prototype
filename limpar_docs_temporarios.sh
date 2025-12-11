#!/bin/bash
# Script para remover documentação temporária antes do commit

echo "🗑️ Removendo documentação temporária..."

# Lista de arquivos .md temporários para remover
ARQUIVOS_REMOVER=(
    "CORRECAO_INCONSISTENCIA_ROI.md"
    "CORRECAO_ROI_PROJECAO_FUTURA.md"
    "EXPLICACAO_SALTOS_ROI.md"
    "IMPLEMENTACAO_BATCH_PROCESSING.md"
    "IMPLEMENTACAO_CACHE_BACKEND.md"
    "IMPLEMENTACAO_ETL_ASSINCRONO.md"
    "PLANEJAMENTO_CONSOLIDADO.md"
    "PLANO_IMPLEMENTACAO_SEGURA.md"
    "PLANO_PERFORMANCE_URGENTE.md"
    "PLANO_UI_MAPA.md"
    "PROXIMOS_PASSOS.md"
    "RASTREAMENTO_ORIGEM_BUYPRICE.md"
    "RECALCULO_ROI_EXECUTADO.md"
    "RESULTADOS_TESTE_PERFORMANCE.md"
    "RESUMO_CORRECAO_INCONSISTENCIA.md"
    "RESUMO_FINAL_PERFORMANCE.md"
    "RESUMO_PERFORMANCE_IMPLEMENTADO.md"
    "RESUMO_SITUACAO_ETL.md"
    "RESUMO_UNIFICACAO_ROI.md"
    "SUGESTAO_PROXIMOS_PASSOS.md"
    "SUGESTAO_PROXIMOS_PASSOS_PERFORMANCE.md"
    "UNIFICACAO_CALCULO_ROI.md"
    "COMMIT_GITHUB_DESKTOP.txt"
    "GIT_COMMIT_MESSAGE.txt"
)

for arquivo in "${ARQUIVOS_REMOVER[@]}"; do
    if [ -f "$arquivo" ]; then
        rm "$arquivo"
        echo "✅ Removido: $arquivo"
    fi
done

echo ""
echo "✅ Limpeza concluída!"
echo ""
echo "📋 Arquivos mantidos:"
echo "  • README.md"
echo "  • PLANO_DE_ACAO.md"
echo "  • PLANO_EXECUCAO.md"
echo "  • PLANO_EVOLUCAO_IA_NUVEM.md"
echo "  • PLANEJAMENTO_CONSOLIDADO_FINAL.md"
echo "  • RESUMO_PLANEJAMENTO.md"
