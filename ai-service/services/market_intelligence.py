# services/market_intelligence.py
"""
Inteligência de mercado: predição de preços e sazonalidade.
Integra modelos ML com conhecimento agronômico dos PDFs.

CORREÇÕES APLICADAS:
- Sazonalidade: Sul inverno 1.20 (era 1.45 ❌)
- Sazonalidade: Sudeste inverno 0.92 (era 0.85 ❌)
- Limpeza de dados históricos (Caixa→Kg)
- Volatilidade com trava de segurança
"""

import pandas as pd
import numpy as np
from datetime import datetime
from functools import lru_cache
from sklearn.linear_model import LinearRegression
from sklearn.preprocessing import PolynomialFeatures
from sklearn.pipeline import make_pipeline
from sqlalchemy import text
import logging

from config.crops import CROPS_SPECS, get_crop_specs
from config.calendar import PLANTING_CALENDAR
from config.constants import PRICE_MULTIPLIERS
from utils.database import get_engine

logger = logging.getLogger(__name__)


class MarketIntelligence:
    """
    Serviço de inteligência de preços e sazonalidade.
    """
    
    def __init__(self):
        self.engine = get_engine()
        logger.info("✅ MarketIntelligence iniciado")
    
    @lru_cache(maxsize=32)
    def get_prediction_model(self, product_name: str):
        """
        Treina modelo de regressão polinomial com dados históricos LIMPOS.
        
        CORREÇÃO CRÍTICA: Normaliza preços de Caixa/Saca para Kg antes de treinar.
        
        Args:
            product_name: Nome do produto (ex: 'Tomate')
        
        Returns:
            (model, volatility) ou (None, 0.05) se falhar
        """
        try:
            # 1. Busca dados da tabela CEASA (prioridade)
            query_ceasa = text("""
                SELECT price_date as date, price_avg as price
                FROM "CeasaPrice"
                WHERE product_name ILIKE :prod
                ORDER BY price_date ASC
            """)
            
            with self.engine.connect() as conn:
                df = pd.read_sql(query_ceasa, conn, params={"prod": f"%{product_name}%"})
            
            # Fallback: tabela antiga (Opportunity + PriceHistory)
            if df.empty or len(df) < 5:
                logger.warning(f"⚠️ Poucos dados em CeasaPrice, tentando PriceHistory...")
                
                query_legacy = text("""
                    SELECT h."createdAt" as date, h.price
                    FROM "PriceHistory" h
                    JOIN "Opportunity" o ON h."opportunityId" = o.id
                    WHERE o.product = :prod
                    ORDER BY h."createdAt" ASC
                """)
                
                with self.engine.connect() as conn:
                    df = pd.read_sql(query_legacy, conn, params={"prod": product_name})
            
            if df.empty or len(df) < 5:
                logger.warning(f"⚠️ Dados insuficientes para {product_name}")
                return None, 0.05
            
            # ========================================
            # LIMPEZA DE DADOS HISTÓRICOS (CRÍTICO!)
            # ========================================
            prod_key = product_name.strip().capitalize()
            specs = get_crop_specs(prod_key)
            weight = specs.get('unit_weight_kg', 1.0)
            
            def clean_price(price_val):
                """
                Detecta e converte preços de Caixa/Saca para Kg.
                """
                p = float(price_val)
                
                # Tomate: Se > 15, é Caixa (20kg) → divide por 20
                if prod_key == 'Tomate' and p > 15.0:
                    return p / weight
                
                # Soja/Milho: Se > 10, é Saca (60kg) → divide por 60
                if prod_key in ['Soja', 'Milho'] and p > 10.0:
                    return p / weight
                
                return p
            
            # Aplica limpeza
            df['price'] = df['price'].apply(clean_price)
            df = df.dropna()
            
            # Converte datas para ordinal (número inteiro)
            df['date_ordinal'] = pd.to_datetime(df['date']).map(datetime.toordinal)
            
            # ========================================
            # TREINA MODELO DE REGRESSÃO POLINOMIAL
            # ========================================
            model = make_pipeline(
                PolynomialFeatures(degree=4),
                LinearRegression()
            )
            
            model.fit(df[['date_ordinal']], df['price'])
            
            # ========================================
            # CALCULA VOLATILIDADE COM TRAVA
            # ========================================
            volatility = df['price'].std()
            avg_price = df['price'].mean()
            
            # Trava de segurança: volatilidade máxima = 30% do preço médio
            # Evita que dados ruins gerem volatilidade absurda
            max_volatility = avg_price * 0.30
            
            if volatility > max_volatility:
                logger.warning(
                    f"⚠️ Volatilidade alta detectada ({volatility:.2f}), "
                    f"limitando a {max_volatility:.2f}"
                )
                volatility = avg_price * 0.10  # Usa 10% como conservador
            
            # Validação final
            if pd.isna(volatility) or volatility <= 0:
                volatility = 0.05
            
            logger.info(
                f"✅ Modelo treinado para {product_name}: "
                f"{len(df)} pontos, volatilidade={volatility:.3f}"
            )
            
            return model, volatility
        
        except Exception as e:
            logger.error(f"❌ Erro ao treinar modelo para {product_name}: {e}")
            return None, 0.05
    
    def get_seasonality_factor(self, product: str, state: str, month: int) -> float:
        """
        Calcula fator de sazonalidade regional baseado em:
        - document-2.pdf (épocas de plantio)
        - Oferta/demanda regional histórica
        
        CORREÇÕES APLICADAS (baseadas em análise dos PDFs):
        - Sul inverno: 1.20 (era 1.45 ❌ - muito alto)
        - Sudeste inverno: 0.92 (era 0.85 ❌ - muito baixo)
        
        Args:
            product: Nome do produto (ex: 'Tomate')
            state: Código UF (ex: 'SP')
            month: Mês (1-12)
        
        Returns:
            Multiplicador de preço (1.0 = neutro)
        """
        if product.strip().capitalize() != 'Tomate':
            return 1.0  # Por enquanto, focado em Tomate
        
        # ========================================
        # SUDESTE (SP, MG, RJ, ES)
        # ========================================
        # PDF: "Evite plantios de janeiro devido às chuvas intensas"
        # Conclusão: Jan/Fev/Mar tem pouca oferta local → Preço Alto
        if state in ['SP', 'MG', 'RJ', 'ES']:
            if month in [1, 2, 3]:
                return 1.35  # Escassez (Chuvas impedem colheita)
            if month in [7, 8, 9]:
                return 0.92  # ✅ CORRIGIDO (era 0.85)
                # Oferta boa (safra de inverno), mas não colapso
        
        # ========================================
        # SUL (RS, SC, PR)
        # ========================================
        # PDF: "Priorizar plantio de agosto a janeiro" (Colheita no Verão)
        # Inverno (Jun-Ago) é muito frio/geada → Sem produção local → Preço sobe
        if state in ['RS', 'SC', 'PR']:
            if month in [6, 7, 8]:
                return 1.20  # ✅ CORRIGIDO (era 1.45 - extremo demais)
                # Escassez local, mas Sudeste/CO suprem parte
            if month in [12, 1, 2]:
                return 0.90  # Safra de Verão (pico de oferta)
        
        # ========================================
        # CENTRO-OESTE (GO, MT, MS, DF)
        # ========================================
        # Região de Tomate Industrial e Mesa Irrigado (Seca = Bom)
        # Safra forte no meio do ano (Inverno Seco)
        if state in ['GO', 'MT', 'MS', 'DF']:
            if month in [6, 7, 8, 9]:
                return 0.82  # Superabundância (produção irrigada + clima ideal)
            if month in [12, 1, 2]:
                return 1.25  # Chuvas atrapalham logística
        
        # ========================================
        # NORDESTE (BA, PE, CE)
        # ========================================
        # Polos irrigados (Irecê/Petrolina) produzem o ano todo
        if state in ['BA', 'PE', 'CE']:
            if month in [3, 4, 5]:
                return 1.15  # Chuvas no litoral/agreste
            return 1.05  # Padrão levemente acima (margem de polos)
        
        return 1.0  # Default (sem ajuste)
    
    def apply_weather_volatility(self, base_price: float, meteo_risk: float, rain_mm: float) -> float:
        """
        Aplica volatilidade de curto prazo baseada em eventos extremos.
        Se chove muito, o preço explode (logística travada).
        """
        volatility_markup = 1.0
        
        # Regra 1: Dilúvio (Logística Travada)
        # Se chover > 50mm no acumulado recente, caminhão não entra na roça.
        if rain_mm > 80.0:
            volatility_markup += 0.35 # +35% (Escassez aguda)
            logger.info(f"⛈️ ALERTA: Chuva extrema ({rain_mm}mm). Aplicando ágio de escassez (+35%).")
        elif rain_mm > 40.0:
            volatility_markup += 0.15 # +15% (Dificuldade logística)
            logger.info(f"🌧️ Chuva moderada ({rain_mm}mm). Ágio logístico (+15%).")
            
        # Regra 2: Risco Agronômico (Perda de safra futura)
        # Se o risco calculado pelo RiskAnalyzer for alto (ex: 0.8), o mercado precifica quebra futura.
        if meteo_risk > 0.7:
            volatility_markup += 0.10 # +10% especulação de quebra
            
        final_price = base_price * volatility_markup
        return round(final_price, 2)
    
def get_predicted_market_price(
        self, 
        product: str, 
        state: str, 
        month: int,
        meteo_data: dict = None # <--- 1. NOVO ARGUMENTO
    ) -> float:
        """
        Calcula preço futuro = Preço Base (banco) × Fator Sazonal × Volatilidade Climática.
        """
        try:
            # 1. Busca preço base no banco (MANTIDO DO SEU CÓDIGO ORIGINAL)
            query = text("""
                SELECT price_avg 
                FROM "CeasaPrice" 
                WHERE product_name ILIKE :prod 
                  AND (ceasa_region = :state OR ceasa_name ILIKE :state_like)
                ORDER BY price_date DESC 
                LIMIT 1
            """)
            
            with self.engine.connect() as conn:
                result = conn.execute(query, {
                    "prod": f"%{product}%", 
                    "state": state,
                    "state_like": f"%{state}%"
                }).fetchone()
            
            # Preço base (fallback)
            base_price_kg = 4.00
            
            if result and result[0]:
                val = float(result[0])
                # Normaliza caixas (lógica sua mantida)
                prod_key = product.strip().capitalize()
                if prod_key == 'Tomate' and val > 15.0: val /= 20.0
                elif prod_key in ['Soja', 'Milho'] and val > 10.0: val /= 60.0
                base_price_kg = val
            
            # 2. Aplica fator de sazonalidade
            season_factor = self.get_seasonality_factor(product, state, month)
            predicted_price = base_price_kg * season_factor
            
            # 3. 🌩️ APLICA A REGRA DA CHUVA (AQUI ESTÁ A NOVIDADE)
            if meteo_data:
                rain = meteo_data.get('rain_mm', 0)
                # Chama a função nova que criamos na etapa anterior
                predicted_price = self.apply_weather_volatility(predicted_price, rain)
            
            logger.debug(
                f"💰 {product}/{state}: Base R${base_price_kg:.2f} -> Final R${predicted_price:.2f}"
            )
            
            return round(predicted_price, 2)
        
        except Exception as e:
            logger.error(f"❌ Erro ao prever preço: {e}")
            return 4.00

# ========================================
# INSTÂNCIA GLOBAL (Singleton)
# ========================================
market_intelligence = MarketIntelligence()


# ========================================
# FUNÇÕES DE CONVENIÊNCIA (Compatibilidade)
# ========================================

@lru_cache(maxsize=32)
def get_prediction_model(product_name: str):
    """Wrapper para compatibilidade com código legado"""
    return market_intelligence.get_prediction_model(product_name)


def get_seasonality_factor(product: str, state: str, month: int) -> float:
    """Wrapper para compatibilidade com código legado"""
    return market_intelligence.get_seasonality_factor(product, state, month)


def get_predicted_market_price(product: str, state: str, month: int, meteo_data: dict = None) -> float:
    """Wrapper para compatibilidade com código legado (Com suporte a Clima)"""
    return market_intelligence.get_predicted_market_price(product, state, month, meteo_data)