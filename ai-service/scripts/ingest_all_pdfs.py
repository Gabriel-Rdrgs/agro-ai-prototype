#!/usr/bin/env python3
"""
Script para ingerir TODOS os PDFs agronômicos no RAG.

Este script processa todos os documentos disponíveis:
- Clima e Produção (Soja, Milho, Tomate)
- Épocas de Plantio (Soja, Milho, Tomate)
- Função Custo de Armazenagem (Soja, Milho, Tomate)

Uso:
    python scripts/ingest_all_pdfs.py

Requisitos:
    - PDFs devem estar na raiz do projeto
    - OPENAI_API_KEY configurada no .env
    - Banco de dados acessível
"""

import os
import sys
import logging
from typing import List, Dict, Optional

# Adiciona os diretórios necessários ao path
CURRENT_DIR = os.path.dirname(__file__)  # ai-service/scripts/
AI_SERVICE_DIR = os.path.dirname(CURRENT_DIR)  # ai-service/
PROJECT_ROOT = os.path.dirname(AI_SERVICE_DIR)  # raiz do projeto (agro-ai-prototype/)

# Adiciona ai-service/ ao path para encontrar o módulo 'services'
if AI_SERVICE_DIR not in sys.path:
    sys.path.insert(0, AI_SERVICE_DIR)

# Adiciona raiz do projeto ao path (para encontrar PDFs)
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

from services.rag_ingestion import DocumentIngestionService

logging.basicConfig(level=logging.INFO, format='%(levelname)s:%(name)s:%(message)s')
logger = logging.getLogger(__name__)


def find_pdf_path(filename: str, project_root: str) -> Optional[str]:
    """
    Procura um PDF em vários locais possíveis.
    
    Args:
        filename: Nome do arquivo PDF
        project_root: Caminho da raiz do projeto
        
    Returns:
        Caminho completo do PDF se encontrado, None caso contrário
    """
    search_paths = [
        os.path.join(project_root, filename),
        os.path.join(project_root, "docs", filename),
        os.path.join(AI_SERVICE_DIR, filename),
        os.path.join(AI_SERVICE_DIR, "docs", filename),
        filename,  # Relativo ao diretório atual
    ]
    
    for path in search_paths:
        if os.path.exists(path):
            return path
    
    return None


def get_all_pdf_configs(project_root: str) -> List[Dict]:
    """
    Retorna configuração de todos os PDFs a serem ingeridos.
    
    Returns:
        Lista de dicionários com 'filename', 'paths', e 'base_metadata'
    """
    configs = [
        # ========== CLIMA E PRODUÇÃO ==========
        {
            "filename": "Clima e Produção de Soja.pdf",
            "base_metadata": {
                "crop": "Soja",
                "theme": "Clima",
                "source_type": "ClimaProducao",
                "category": "Clima e Produção"
            }
        },
        {
            "filename": "Clima e Produção de Milho no Brasil.pdf",
            "base_metadata": {
                "crop": "Milho",
                "theme": "Clima",
                "source_type": "ClimaProducao",
                "category": "Clima e Produção"
            }
        },
        {
            "filename": "Clima e Produção de Tomates no Brasil.pdf",
            "base_metadata": {
                "crop": "Tomate",
                "theme": "Clima",
                "source_type": "ClimaProducao",
                "category": "Clima e Produção"
            }
        },
        # ========== ÉPOCAS DE PLANTIO ==========
        {
            "filename": "Épocas de Plantio e Métricas de Decisão para Cultivo de Soja no Brasil.pdf",
            "base_metadata": {
                "crop": "Soja",
                "theme": "Épocas de Plantio",
                "source_type": "EpocasPlantio",
                "category": "Épocas de Plantio"
            }
        },
        {
            "filename": "Épocas de Plantio e Métricas de Decisão para Cultivo de Milho no Brasil.pdf",
            "base_metadata": {
                "crop": "Milho",
                "theme": "Épocas de Plantio",
                "source_type": "EpocasPlantio",
                "category": "Épocas de Plantio"
            }
        },
        {
            "filename": "Épocas de Plantio e Métricas de Decisão paraCultivo de Tomate no Brasil.pdf",
            "base_metadata": {
                "crop": "Tomate",
                "theme": "Épocas de Plantio",
                "source_type": "EpocasPlantio",
                "category": "Épocas de Plantio"
            }
        },
        # ========== CUSTO DE ARMAZENAGEM ==========
        {
            "filename": "Função Custo Armazenagem Soja.pdf",
            "base_metadata": {
                "crop": "Soja",
                "theme": "Custo de Armazenagem",
                "source_type": "CustoArmazenagem",
                "category": "Custo de Armazenagem"
            }
        },
        {
            "filename": "Função Custo de Armazenagem de Milho.pdf",
            "base_metadata": {
                "crop": "Milho",
                "theme": "Custo de Armazenagem",
                "source_type": "CustoArmazenagem",
                "category": "Custo de Armazenagem"
            }
        },
        {
            "filename": "Função Custo de Armazenagem de Tomate.pdf",
            "base_metadata": {
                "crop": "Tomate",
                "theme": "Custo de Armazenagem",
                "source_type": "CustoArmazenagem",
                "category": "Custo de Armazenagem"
            }
        },
    ]
    
    # Adiciona caminhos de busca para cada configuração
    for cfg in configs:
        filename = cfg["filename"]
        cfg["path"] = find_pdf_path(filename, project_root)
    
    return configs


def print_summary(results: List[Dict]):
    """
    Imprime um resumo detalhado dos resultados da ingestão.
    
    Args:
        results: Lista de resultados com 'config', 'status', 'chunks', 'error'
    """
    logger.info("")
    logger.info("="*80)
    logger.info("📊 RESUMO DETALHADO DA INGESTÃO")
    logger.info("="*80)
    
    # Agrupa por status
    success = [r for r in results if r["status"] == "success"]
    not_found = [r for r in results if r["status"] == "not_found"]
    errors = [r for r in results if r["status"] == "error"]
    
    # Estatísticas gerais
    total_chunks = sum(r.get("chunks", 0) for r in success)
    
    logger.info(f"")
    logger.info(f"✅ SUCESSOS: {len(success)}/{len(results)} PDFs ingeridos")
    logger.info(f"⚠️  NÃO ENCONTRADOS: {len(not_found)} PDFs")
    logger.info(f"❌ ERROS: {len(errors)} PDFs")
    logger.info(f"📄 TOTAL DE CHUNKS: {total_chunks} documentos no banco vetorial")
    logger.info(f"")
    
    # Detalhes por categoria
    if success:
        logger.info("✅ PDFs INGERIDOS COM SUCESSO:")
        logger.info("-" * 80)
        
        # Agrupa por categoria
        by_category = {}
        for r in success:
            category = r["config"]["base_metadata"]["category"]
            if category not in by_category:
                by_category[category] = []
            by_category[category].append(r)
        
        for category, items in sorted(by_category.items()):
            logger.info(f"")
            logger.info(f"📁 {category}:")
            for r in items:
                crop = r["config"]["base_metadata"]["crop"]
                chunks = r.get("chunks", 0)
                filename = r["config"]["filename"]
                logger.info(f"   ✅ {crop}: {chunks} chunks - {filename}")
    
    if not_found:
        logger.info("")
        logger.info("⚠️  PDFs NÃO ENCONTRADOS:")
        logger.info("-" * 80)
        for r in not_found:
            logger.info(f"   ⚠️  {r['config']['filename']}")
    
    if errors:
        logger.info("")
        logger.info("❌ ERROS NA INGESTÃO:")
        logger.info("-" * 80)
        for r in errors:
            crop = r["config"]["base_metadata"]["crop"]
            error_msg = r.get("error", "Erro desconhecido")
            logger.info(f"   ❌ {crop} ({r['config']['filename']}): {error_msg}")
    
    logger.info("")
    logger.info("="*80)
    
    if len(success) == len(results):
        logger.info("🎉 TODOS OS PDFs FORAM INGERIDOS COM SUCESSO!")
        logger.info("💡 O chat agora pode responder perguntas sobre:")
        crops = set(r["config"]["base_metadata"]["crop"] for r in success)
        logger.info(f"   Culturas: {', '.join(sorted(crops))}")
        categories = set(r["config"]["base_metadata"]["category"] for r in success)
        logger.info(f"   Temas: {', '.join(sorted(categories))}")
    elif len(success) > 0:
        logger.info(f"✅ {len(success)} PDFs ingeridos com sucesso!")
        logger.info(f"⚠️  {len(not_found) + len(errors)} PDFs não foram processados.")
    else:
        logger.warning("⚠️  NENHUM PDF FOI INGERIDO. Verifique se os arquivos existem na raiz do projeto.")
    
    logger.info("="*80)


def main():
    """Ingere todos os PDFs agronômicos disponíveis."""
    
    logger.info("="*80)
    logger.info("🌾 INGESTÃO COMPLETA DE PDFs AGRONÔMICOS")
    logger.info("="*80)
    logger.info(f"📁 Raiz do projeto: {PROJECT_ROOT}")
    
    # Verifica se a raiz existe e lista PDFs encontrados
    if os.path.exists(PROJECT_ROOT):
        logger.info(f"✅ Diretório raiz existe")
        # Lista todos os PDFs na raiz para debug
        pdfs_in_root = sorted([f for f in os.listdir(PROJECT_ROOT) if f.endswith('.pdf')])
        if pdfs_in_root:
            logger.info(f"📚 PDFs encontrados na raiz ({len(pdfs_in_root)} arquivos):")
            for pdf in pdfs_in_root:
                logger.info(f"   - {pdf}")
        else:
            logger.warning(f"⚠️ Nenhum PDF encontrado na raiz do projeto")
    else:
        logger.error(f"❌ Diretório raiz não existe: {PROJECT_ROOT}")
        return
    
    logger.info("")
    logger.info("="*80)
    
    # Obtém todas as configurações
    configs = get_all_pdf_configs(PROJECT_ROOT)
    logger.info(f"📋 Total de PDFs a processar: {len(configs)}")
    logger.info("")
    
    # Inicializa o serviço
    service = DocumentIngestionService()
    
    # Processa cada PDF
    results = []
    for i, cfg in enumerate(configs, 1):
        filename = cfg["filename"]
        crop = cfg["base_metadata"]["crop"]
        category = cfg["base_metadata"]["category"]
        path = cfg["path"]
        
        logger.info(f"[{i}/{len(configs)}] 🔍 Processando: {filename}")
        logger.info(f"   Cultura: {crop} | Categoria: {category}")
        
        if not path:
            logger.warning(f"   ⚠️  PDF não encontrado!")
            results.append({
                "config": cfg,
                "status": "not_found",
                "chunks": 0
            })
            continue
        
        logger.info(f"   📄 Arquivo encontrado: {path}")
        
        try:
            # Processa e salva (o serviço já faz log interno e retorna número de chunks)
            chunks_count = service.process_and_save(path, base_metadata=cfg["base_metadata"])
            
            results.append({
                "config": cfg,
                "status": "success",
                "chunks": chunks_count
            })
            logger.info(f"   ✅ Sucesso! {chunks_count} chunks salvos.")
            
        except Exception as e:
            logger.error(f"   ❌ Erro: {e}")
            results.append({
                "config": cfg,
                "status": "error",
                "chunks": 0,
                "error": str(e)
            })
        
        logger.info("")
    
    # Imprime resumo
    print_summary(results)


if __name__ == "__main__":
    main()

