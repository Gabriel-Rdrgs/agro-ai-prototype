# ai-service/Dockerfile

# 1. Imagem base leve do Python
FROM python:3.10-slim

# 2. Define pasta de trabalho dentro do container
WORKDIR /app

# 3. Instala dependências do sistema (necessário para psycopg2 e numpy)
RUN apt-get update && apt-get install -y \
    gcc \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# 4. Copia e instala as dependências do Python
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 5. Copia todo o código para dentro do container
COPY . .

# 6. Expõe a porta 8000
EXPOSE 8000

# 7. Comando para iniciar o servidor
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]