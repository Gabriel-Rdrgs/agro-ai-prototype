#!/usr/bin/env python3
"""
Script para extrair fórmulas e parâmetros dos PDFs base.
Gera um arquivo centralizado com todas as fórmulas matemáticas.
"""

import sys
import os
import re
from pathlib import Path

# Adiciona o diretório raiz ao path
sys.path.insert(0, str(Path(__file__).parent.parent))

from langchain_community.document_loaders import PyPDFLoader
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def extract_text_from_pdf(pdf_path: str) -> str:
    """Extrai todo o texto de um PDF."""
    try:
        loader = PyPDFLoader(pdf_path)
        docs = loader.load()
        full_text = "\n\n".join([doc.page_content for doc in docs])
        return full_text
    except Exception as e:
        logger.error(f"Erro ao extrair texto de {pdf_path}: {e}")
        return ""

def find_formulas(text: str) -> list:
    """Encontra fórmulas matemáticas no texto."""
    formulas = []
    
    # Padrões comuns de fórmulas
    patterns = [
        r'[A-Z][a-z]*\s*=\s*[^\.]+',  # Variável = expressão
        r'[A-Z][a-z]*\s*\([^\)]+\)\s*=\s*[^\.]+',  # Função(...) = expressão
        r'[A-Z][a-z]*\s*=\s*[0-9]+\.[0-9]+',  # Constantes numéricas
        r'[A-Z][a-z]*\s*=\s*[0-9]+%',  # Porcentagens
        r'[A-Z][a-z]*\s*=\s*[0-9]+\s*[A-Za-z]+',  # Valores com unidades
    ]
    
    for pattern in patterns:
        matches = re.finditer(pattern, text, re.MULTILINE)
        for match in matches:
            formulas.append(match.group(0))
    
    return formulas

def find_parameters(text: str) -> dict:
    """Encontra parâmetros e constantes no texto."""
    params = {}
    
    # Padrões de parâmetros
    patterns = {
        'temperature': r'([0-9]+(?:\.[0-9]+)?)\s*°C',
        'percentage': r'([0-9]+(?:\.[0-9]+)?)\s*%',
        'cost': r'R\$\s*([0-9]+(?:\.[0-9]+)?)',
        'weight': r'([0-9]+(?:\.[0-9]+)?)\s*kg',
        'days': r'([0-9]+)\s*dias?',
        'months': r'([0-9]+)\s*meses?',
    }
    
    for param_type, pattern in patterns.items():
        matches = re.findall(pattern, text, re.IGNORECASE)
        if matches:
            params[param_type] = list(set(matches))[:10]  # Limita a 10 exemplos
    
    return params

def main():
    """Função principal."""
    docs_dir = Path(__file__).parent.parent / "docs"
    
    pdfs = [
        "Épocas de Plantio e Métricas de Decisão paraCultivo de Tomate no Brasil.pdf",
        "estudos tomate.pdf",
        "Função Custo de Armazenagem de Tomate.pdf"
    ]
    
    all_formulas = {}
    all_parameters = {}
    all_text = {}
    
    for pdf_name in pdfs:
        pdf_path = docs_dir / pdf_name
        if not pdf_path.exists():
            logger.warning(f"⚠️ PDF não encontrado: {pdf_path}")
            continue
        
        logger.info(f"📄 Processando: {pdf_name}")
        text = extract_text_from_pdf(str(pdf_path))
        all_text[pdf_name] = text
        
        formulas = find_formulas(text)
        all_formulas[pdf_name] = formulas
        
        parameters = find_parameters(text)
        all_parameters[pdf_name] = parameters
        
        logger.info(f"   ✅ Extraído: {len(text)} caracteres, {len(formulas)} fórmulas, {len(parameters)} tipos de parâmetros")
    
    # Salva resumo em arquivo
    output_file = docs_dir / "FORMULAS_EXTRAIDAS.md"
    with open(output_file, 'w', encoding='utf-8') as f:
        f.write("# FÓRMULAS E PARÂMETROS EXTRAÍDOS DOS PDFs BASE\n\n")
        f.write("Este arquivo contém todas as fórmulas e parâmetros encontrados nos 3 documentos base.\n\n")
        
        for pdf_name, formulas in all_formulas.items():
            f.write(f"## {pdf_name}\n\n")
            f.write(f"### Fórmulas encontradas ({len(formulas)}):\n\n")
            for i, formula in enumerate(formulas[:50], 1):  # Limita a 50 por PDF
                f.write(f"{i}. {formula}\n")
            f.write("\n")
            
            if pdf_name in all_parameters:
                f.write(f"### Parâmetros encontrados:\n\n")
                for param_type, values in all_parameters[pdf_name].items():
                    f.write(f"- **{param_type}**: {', '.join(values[:5])}\n")
                f.write("\n")
        
        f.write("\n## TEXTO COMPLETO (primeiros 5000 caracteres de cada PDF)\n\n")
        for pdf_name, text in all_text.items():
            f.write(f"### {pdf_name}\n\n")
            f.write("```\n")
            f.write(text[:5000])
            f.write("\n...\n```\n\n")
    
    logger.info(f"✅ Resumo salvo em: {output_file}")
    logger.info(f"📊 Total: {sum(len(f) for f in all_formulas.values())} fórmulas encontradas")
    
    return all_text, all_formulas, all_parameters

if __name__ == "__main__":
    main()


