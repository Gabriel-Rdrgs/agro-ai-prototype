#!/usr/bin/env python3
"""
Script para ingerir PDFs de Soja e Milho no RAG.

Uso:
    python scripts/ingest_soja_milho.py

Requisitos:
    - PDFs devem estar na raiz do projeto ou em docs/
    - OPENAI_API_KEY configurada no .env
    - Banco de dados acessível
"""

import os
import sys
import logging

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

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def main():
    """Ingere PDFs de Soja e Milho."""
    
    logger.info("="*60)
    logger.info("🌾 INGESTÃO DE PDFs - SOJA E MILHO")
    logger.info("="*60)
    logger.info(f"📁 Raiz do projeto: {PROJECT_ROOT}")
    
    # Verifica se a raiz existe e lista PDFs encontrados
    if os.path.exists(PROJECT_ROOT):
        logger.info(f"✅ Diretório raiz existe")
        # Lista todos os PDFs na raiz para debug
        pdfs_in_root = [f for f in os.listdir(PROJECT_ROOT) if f.endswith('.pdf')]
        if pdfs_in_root:
            logger.info(f"📚 PDFs encontrados na raiz: {', '.join(pdfs_in_root)}")
        else:
            logger.warning(f"⚠️ Nenhum PDF encontrado na raiz do projeto")
    else:
        logger.error(f"❌ Diretório raiz não existe: {PROJECT_ROOT}")
    
    logger.info("="*60)
    
    service = DocumentIngestionService()
    
    # Configurações de PDFs para Soja e Milho
    # Os PDFs estão na raiz do projeto
    pdf_configs = [
        # SOJA
        {
            "paths": [
                # Raiz do projeto (onde os PDFs realmente estão)
                os.path.join(PROJECT_ROOT, "Clima e Produção de Soja.pdf"),
                # Alternativas (caso estejam em outros lugares)
                os.path.join(PROJECT_ROOT, "docs", "Clima e Produção de Soja.pdf"),
                os.path.join(AI_SERVICE_DIR, "Clima e Produção de Soja.pdf"),
                os.path.join(AI_SERVICE_DIR, "docs", "Clima e Produção de Soja.pdf"),
                # Relativo ao script (se executado da raiz)
                "Clima e Produção de Soja.pdf",
            ],
            "base_metadata": {
                "crop": "Soja",
                "theme": "Clima",
                "source_type": "ClimaProducao"
            }
        },
        # MILHO (nome correto: "Clima e Produção de Milho no Brasil.pdf")
        {
            "paths": [
                # Raiz do projeto (nome correto com "no Brasil")
                os.path.join(PROJECT_ROOT, "Clima e Produção de Milho no Brasil.pdf"),
                # Alternativas (caso estejam em outros lugares ou com nome diferente)
                os.path.join(PROJECT_ROOT, "Clima e Produção de Milho.pdf"),
                os.path.join(PROJECT_ROOT, "docs", "Clima e Produção de Milho no Brasil.pdf"),
                os.path.join(PROJECT_ROOT, "docs", "Clima e Produção de Milho.pdf"),
                os.path.join(AI_SERVICE_DIR, "Clima e Produção de Milho no Brasil.pdf"),
                os.path.join(AI_SERVICE_DIR, "Clima e Produção de Milho.pdf"),
                # Relativo ao script
                "Clima e Produção de Milho no Brasil.pdf",
                "Clima e Produção de Milho.pdf",
            ],
            "base_metadata": {
                "crop": "Milho",
                "theme": "Clima",
                "source_type": "ClimaProducao"
            }
        }
    ]
    
    success_count = 0
    error_count = 0
    
    for cfg in pdf_configs:
        crop = cfg["base_metadata"]["crop"]
        
        # Debug: mostra onde está procurando
        logger.info(f"🔍 Procurando PDF de {crop}...")
        for path in cfg["paths"]:
            exists = os.path.exists(path)
            logger.info(f"   {'✅' if exists else '❌'} {path}")
        
        existing_path = next((p for p in cfg["paths"] if os.path.exists(p)), None)
        
        if existing_path:
            logger.info(f"📚 Encontrado PDF para {crop}: {existing_path}")
            try:
                service.process_and_save(existing_path, base_metadata=cfg["base_metadata"])
                success_count += 1
                logger.info(f"✅ PDF de {crop} ingerido com sucesso!")
            except Exception as e:
                error_count += 1
                logger.error(f"❌ Erro ao ingerir PDF de {crop}: {e}")
        else:
            error_count += 1
            logger.warning(
                f"⚠️ PDF de {crop} não encontrado em nenhum dos caminhos:\n"
                f"   {', '.join(cfg['paths'])}\n"
                f"   Verifique se o PDF foi colocado na pasta correta."
            )
    
    logger.info("="*60)
    logger.info(f"📊 RESUMO: {success_count} sucesso(s), {error_count} erro(s)")
    logger.info("="*60)
    
    if success_count > 0:
        logger.info("✅ Ingestão concluída! O chat agora pode responder perguntas sobre Soja e Milho.")
    else:
        logger.warning("⚠️ Nenhum PDF foi ingerido. Verifique se os arquivos existem.")

if __name__ == "__main__":
    main()

