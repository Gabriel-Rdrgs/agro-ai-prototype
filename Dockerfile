# Dockerfile para Backup Worker
# Este arquivo é usado pelo Railway quando Root Directory está vazio
# Para outros serviços, use os Dockerfiles específicos:
# - ai-service/Dockerfile (para AI Service)
# - backend/Dockerfile (para Backend)
FROM python:3.10-slim

WORKDIR /app

# 1. Instala dependências do sistema
# Instala postgresql-client 17 para compatibilidade com Supabase (PostgreSQL 17)
RUN apt-get update && apt-get install -y \
    wget \
    ca-certificates \
    gnupg \
    lsb-release \
    && wget --quiet -O - https://www.postgresql.org/media/keys/ACCC4CF8.asc | gpg --dearmor -o /usr/share/keyrings/postgresql-keyring.gpg \
    && sh -c 'echo "deb [signed-by=/usr/share/keyrings/postgresql-keyring.gpg] http://apt.postgresql.org/pub/repos/apt $(lsb_release -cs)-pgdg main" > /etc/apt/sources.list.d/pgdg.list' \
    && apt-get update \
    && apt-get install -y postgresql-client-17 \
    && rm -rf /var/lib/apt/lists/*

# 2. Copia apenas os scripts necessários
COPY scripts/backup_postgres.py /app/scripts/
COPY scripts/backup_worker.py /app/scripts/

# 3. Instala dependências Python mínimas
RUN pip install --no-cache-dir python-dotenv schedule

# 4. Comando padrão (pode ser sobrescrito no Railway)
CMD ["python", "scripts/backup_worker.py", "--once"]

