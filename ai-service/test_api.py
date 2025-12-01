import requests

def testar_integracao(api_url="https://combustivelapi.com.br/api/precos"):
    headers = {
        "Accept": "application/json",
        "User-Agent": "Agro-AI/6.0 Fuel Intelligence Module"
    }
    response = requests.get(api_url, headers=headers, timeout=8)
    print(response.json())  # Mostra o resultado retornado pela API

# Chame a função para testar
testar_integracao()
