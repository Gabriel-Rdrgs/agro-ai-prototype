# Dockerfile de Produção para o Serviço de IA
FROM python:3.10-slim

WORKDIR /app

# 1. Instala dependências do sistema (necessário para Pandas/Numpy e backups)
# Instala postgresql-client mais recente para compatibilidade com PostgreSQL 17
RUN apt-get update && apt-get install -y \
    gcc \
    libpq-dev \
    wget \
    ca-certificates \
    gnupg \
    lsb-release \
    && wget --quiet -O - https://www.postgresql.org/media/keys/ACCC4CF8.asc | gpg --dearmor -o /usr/share/keyrings/postgresql-keyring.gpg \
    && sh -c 'echo "deb [signed-by=/usr/share/keyrings/postgresql-keyring.gpg] http://apt.postgresql.org/pub/repos/apt $(lsb_release -cs)-pgdg main" > /etc/apt/sources.list.d/pgdg.list' \
    && apt-get update \
    && apt-get install -y postgresql-client-17 \
    && rm -rf /var/lib/apt/lists/*

# 2. Copia e instala dependências Python
COPY requirements.txt .
# Aumenta timeout para evitar erro em bibliotecas grandes
RUN pip install --no-cache-dir --default-timeout=100 -r requirements.txt

# 2.1. Instala CmdStanPy e CmdStan (necessário para Prophet)
RUN pip install --no-cache-dir --upgrade cmdstanpy && \
    python -c "from cmdstanpy import install_cmdstan; install_cmdstan(verbose=False)" && \
    pip install --no-cache-dir --upgrade prophet

# 3. Copia o código fonte
COPY . .

# 4. Configuração de Porta
ENV PORT=8000
EXPOSE $PORT

# 5. Comando de Inicialização
CMD uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000}