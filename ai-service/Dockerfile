# Dockerfile de Produção para o Serviço de IA
FROM python:3.10-slim

WORKDIR /app

# 1. Instala dependências do sistema (necessário para Pandas/Numpy)
RUN apt-get update && apt-get install -y \
    gcc \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# 2. Copia e instala dependências Python
COPY requirements.txt .
# Aumenta timeout para evitar erro em bibliotecas grandes
RUN pip install --no-cache-dir --default-timeout=100 -r requirements.txt

# 3. Copia o código fonte
COPY . .

# 4. Configuração de Porta
ENV PORT=8000
EXPOSE $PORT

# 5. Comando de Inicialização
CMD uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000}