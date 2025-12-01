# ai-service/services/logistics.py
import logging
import math
from typing import Dict, List
from services.fuel_pricing import fuel_api
from config.constants import STATE_COORDS
from utils.geography import calculate_distance_coords 

logger = logging.getLogger(__name__)

HUBS = {
    'SP': {'name': 'CEAGESP - SP', 'lat': -23.55, 'lng': -46.63, 'premium': 1.08},
    'RJ': {'name': 'CEASA - RJ', 'lat': -22.84, 'lng': -43.35, 'premium': 1.06}, 
    'MG': {'name': 'CEASA - MG', 'lat': -19.92, 'lng': -44.04, 'premium': 1.04},
    'PR': {'name': 'CEASA - PR', 'lat': -25.50, 'lng': -49.29, 'premium': 1.03},
    'PE': {'name': 'CEASA - PE', 'lat': -8.07, 'lng': -34.93, 'premium': 1.05},
    'GO': {'name': 'CEASA - GO', 'lat': -16.63, 'lng': -49.22, 'premium': 1.00},
    'BA': {'name': 'CEASA - BA', 'lat': -12.87, 'lng': -38.43, 'premium': 1.02},
    'RS': {'name': 'CEASA - RS', 'lat': -30.03, 'lng': -51.23, 'premium': 1.05}, 
    'SC': {'name': 'CEASA - SC', 'lat': -27.60, 'lng': -48.55, 'premium': 1.04},
    'MT': {'name': 'CEASA - MT', 'lat': -15.60, 'lng': -56.10, 'premium': 1.01}
}

class LogisticsService:
    def __init__(self):
        self.truck_consumption = 3.5 
        self.maintenance_per_km = 1.50

    def calculate_freight(self, origin_lat: float, origin_lng: float, dest_state: str) -> float:
        """Calcula custo de frete (Com Fator de Retorno e Pedágio Pesado)"""
        if dest_state not in HUBS: return 0.0
        
        dest = HUBS[dest_state]
        dist = calculate_distance_coords(origin_lat, origin_lng, dest['lat'], dest['lng'])
        
        try:
            fuel_data = fuel_api.get_diesel_price('BR')
            diesel_price = fuel_data.get('price_per_liter', 6.00)
        except:
            diesel_price = 6.00
        
        # --- CALIBRAGEM DE REALIDADE ---
        
        # 1. Fator de Retorno (Empty Leg): 
        # Cobra +30% para cobrir o risco de voltar vazio ou o tempo de espera
        return_factor = 1.30 
        
        fuel_cost = ((dist / self.truck_consumption) * diesel_price) * return_factor
        maint_cost = (dist * self.maintenance_per_km) * return_factor
        
        # 2. Custos Extras
        # Pedágio: Aumentado para R$ 0,40/km (Média truck eixos suspensos)
        toll_cost = dist * 0.40 
        
        # Seguro e Risco: R$ 200 fixo + taxa por km
        insurance_cost = 200.0 + (dist * 0.15)
        
        # Carga/Descarga e Estadia
        handling_cost = 400.0 
        
        total_freight = fuel_cost + maint_cost + toll_cost + insurance_cost + handling_cost
        
        return round(total_freight, 2)

    def analyze_routes(self, product: str, origin_state: str, lat: float, lng: float, base_price: float) -> List[Dict]:
        """
        Retorna LISTA de rotas ordenadas por lucro líquido.
        """
        if lat == 0 or lng == 0:
            lat, lng = STATE_COORDS.get(origin_state, (-15.0, -48.0))

        # 1. Opção Local
        routes = [{
            "dest_name": f"CEASA - {origin_state}",
            "dest_state": origin_state,
            "sell_price": base_price,
            "freight_cost": 0.0,
            "net_result": base_price,
            "distance_km": 0
        }]
        
        # 2. Hubs Vizinhos
        candidates = list(HUBS.keys())
        if origin_state in candidates: candidates.remove(origin_state)
        
        volume_carga = 15000 
        local_premium = HUBS.get(origin_state, {'premium': 1.0})['premium']

        for dest_uf in candidates:
            try:
                dest_premium = HUBS[dest_uf]['premium']
                estimated_price = base_price * (dest_premium / local_premium)
                
                freight_total = self.calculate_freight(lat, lng, dest_uf)
                freight_per_kg = freight_total / volume_carga
                
                net_price = estimated_price - freight_per_kg
                
                routes.append({
                    "dest_name": HUBS[dest_uf]['name'],
                    "dest_state": dest_uf,
                    "sell_price": round(estimated_price, 2),
                    "freight_cost": round(freight_per_kg, 2),
                    "net_result": round(net_price, 2),
                    "distance_km": int(freight_total / 1.3)
                })
            except: continue
                
        # Ordena do maior lucro para o menor
        routes.sort(key=lambda x: x['net_result'], reverse=True)
        return routes

    # Mantém compatibilidade com código antigo que espera apenas o vencedor
    def find_best_route(self, product: str, origin_state: str, lat: float, lng: float, base_price: float) -> Dict:
        """
        Encontra melhor destino considerando:
        1. Lucro Líquido (Preço - Frete)
        2. Perda de Qualidade por km (Perecibilidade)
        """
        if lat == 0 or lng == 0:
            lat, lng = STATE_COORDS.get(origin_state, (-15.0, -48.0))

        # --- Fator de Perecibilidade (O Segredo da Decisão) ---
        # Tomate perde valor rápido na estrada (vibração, tempo).
        # Grãos (Soja/Milho) aguentam viagem longa sem perder valor.
        quality_penalty_per_km = 0.0
        if product and 'Tomate' in product:
            # Perde R$ 0,0004 por kg a cada km (R$ 0,40 a cada 1000km)
            # Isso simula que o tomate que viaja muito chega "pior" e vende mais barato
            quality_penalty_per_km = 0.0004 
        
        # 1. Opção Local (Referência)
        best_dest = {
            "dest_name": f"CEASA - {origin_state}",
            "dest_state": origin_state,
            "sell_price": base_price,
            "freight_cost": 0.0,
            "net_result": base_price,
            "distance_km": 0
        }
        
        # 2. Hubs Vizinhos
        candidates = list(HUBS.keys())
        if origin_state in candidates: candidates.remove(origin_state)
        
        volume_carga = 15000 
        local_premium = HUBS.get(origin_state, {'premium': 1.0})['premium']

        for dest_uf in candidates:
            try:
                # Estimativa de preço bruto
                dest_premium = HUBS[dest_uf]['premium']
                estimated_price = base_price * (dest_premium / local_premium)
                
                # Custo do Frete Físico (Diesel + Pedágio)
                dist = calculate_distance_coords(lat, lng, HUBS[dest_uf]['lat'], HUBS[dest_uf]['lng'])
                freight_total = self.calculate_freight(lat, lng, dest_uf) # Já usa a função interna corrigida
                freight_per_kg = freight_total / volume_carga
                
                # Custo de Qualidade (Perecibilidade)
                quality_loss = dist * quality_penalty_per_km
                
                # Preço Líquido Real = Preço Destino - Frete - Perda Qualidade
                net_price = estimated_price - freight_per_kg - quality_loss
                
                # Só troca se o ganho líquido superar a margem de risco (R$ 0,15)
                if net_price > (best_dest['net_result'] + 0.15):
                    best_dest = {
                        "dest_name": HUBS[dest_uf]['name'],
                        "dest_state": dest_uf,
                        "sell_price": round(estimated_price, 2), # Preço de balcão
                        "freight_cost": round(freight_per_kg, 2),
                        "net_result": round(net_price, 2), # O que sobra no bolso
                        "distance_km": int(dist)
                    }
            except Exception as e:
                logger.error(f"Logística erro {dest_uf}: {e}")
                continue
                
        # Ordena: Maior lucro líquido primeiro
        return best_dest
    
    # IMPORTANTE: Mantenha o método analyze_routes também atualizado com a mesma lógica se ele existir no arquivo
    # Vou incluir ele aqui para garantir a consistência no ranking da tabela
    def analyze_routes(self, product: str, origin_state: str, lat: float, lng: float, base_price: float) -> List[Dict]:
        """Gera ranking completo com penalidade de qualidade"""
        # (Copie a mesma lógica de quality_penalty_per_km do find_best_route acima)
        if lat == 0 or lng == 0:
            lat, lng = STATE_COORDS.get(origin_state, (-15.0, -48.0))

        quality_penalty_per_km = 0.0004 if product and 'Tomate' in product else 0.0

        routes = [{
            "destination": origin_state,
            "dest_name": f"CEASA - {origin_state}",
            "dest_state": origin_state,
            "sell_price": base_price,
            "freight_cost": 0.0,
            "net_result": base_price,
            "distance_km": 0
        }]
        
        candidates = list(HUBS.keys())
        if origin_state in candidates: candidates.remove(origin_state)
        
        volume_carga = 15000 
        local_premium = HUBS.get(origin_state, {'premium': 1.0})['premium']

        for dest_uf in candidates:
            try:
                dest_premium = HUBS[dest_uf]['premium']
                estimated_price = base_price * (dest_premium / local_premium)
                
                dist = calculate_distance_coords(lat, lng, HUBS[dest_uf]['lat'], HUBS[dest_uf]['lng'])
                freight_total = self.calculate_freight(lat, lng, dest_uf) # Usa o cálculo interno
                freight_per_kg = freight_total / volume_carga
                
                quality_loss = dist * quality_penalty_per_km
                net_price = estimated_price - freight_per_kg - quality_loss
                
                routes.append({
                    "destination": dest_uf,
                    "dest_name": HUBS[dest_uf]['name'],
                    "dest_state": dest_uf,
                    "sell_price": round(estimated_price, 2),
                    "freight_cost": round(freight_per_kg, 2),
                    "net_result": round(net_price, 2),
                    "distance_km": int(dist)
                })
            except: continue
                
        routes.sort(key=lambda x: x['net_result'], reverse=True)
        return routes

logistics_service = LogisticsService()