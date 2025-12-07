# ai-service/models/document_model.py
import uuid
from sqlalchemy import Column, String, DateTime, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.sql import func
from pgvector.sqlalchemy import Vector
from utils.database import Base  # <--- Aqui está o segredo: importamos a infra

class Document(Base):
    __tablename__ = "documents"

    # AQUI ESTÁ A CORREÇÃO DO ERRO ANTERIOR:
    # Usamos 'default' do Python, não 'server_default' do Banco.
    # O Python gera o ID antes de mandar pro banco, garantindo que nunca vá Nulo.
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    
    content = Column(Text, nullable=False)
    metadata_ = Column("metadata", JSONB) 
    
    # Vetor de 1536 dimensões (Padrão OpenAI)
    embedding = Column(Vector(1536))
    
    createdAt = Column("createdAt", DateTime(timezone=True), server_default=func.now())