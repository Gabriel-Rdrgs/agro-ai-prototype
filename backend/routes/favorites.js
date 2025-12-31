// backend/routes/favorites.js

const express = require('express');
const router = express.Router();
const prisma = require('../utils/prisma');
const { dbCircuitBreaker } = require('../utils/circuitBreaker');
const { verifyToken } = require('../authMiddleware');
const logger = require('../utils/logger');
const { logAction } = require('../services/auditService');

// ============================================
// ⭐ ROTAS DE FAVORITOS
// ============================================

// Verificação de segurança: garante que o modelo Favorite está disponível
if (!prisma.favorite) {
  logger.error('❌ CRÍTICO: Modelo Favorite não disponível no Prisma Client. Execute: npx prisma generate');
}

/**
 * GET /api/favorites
 * Retorna todos os favoritos do usuário autenticado
 */
router.get('/', verifyToken, async (req, res) => {
  try {
    const userId = req.user.id; // UUID do Supabase
    
    logger.info(`⭐ Buscando favoritos do usuário ${userId}...`);
    
    // Verificação de segurança: garante que o modelo Favorite está disponível
    if (!prisma.favorite) {
      logger.error('❌ Modelo Favorite não disponível no Prisma Client');
      return res.status(500).json({
        success: false,
        error: 'Modelo Favorite não disponível. Reinicie o servidor após regenerar o Prisma Client.'
      });
    }
    
    const favorites = await dbCircuitBreaker.execute(async () => {
      return await prisma.favorite.findMany({
        where: {
          userId: userId
        },
        include: {
          opportunity: {
            include: {
              history: {
                orderBy: {
                  createdAt: 'desc'
                },
                take: 30 // Últimos 30 registros de histórico
              }
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        }
      });
    });
    
    logger.info(`✅ Encontrados ${favorites.length} favoritos`);
    
    // ✅ CORREÇÃO: Formata no mesmo padrão da API de oportunidades
    res.json({
      success: true,
      count: favorites.length,
      favorites: favorites.map(fav => {
        const opp = fav.opportunity;
        
        // Converte Decimal para número
        const buyPrice = opp.buyPrice ? parseFloat(opp.buyPrice) : 0;
        const sellPrice = opp.sellPrice ? parseFloat(opp.sellPrice) : 0;
        const freight = opp.freight ? parseFloat(opp.freight) : null;
        const roi = opp.roi ? parseFloat(opp.roi) : null;
        
        return {
          id: fav.id,
          opportunityId: fav.opportunityId,
          notes: fav.notes,
          createdAt: fav.createdAt,
          updatedAt: fav.updatedAt,
          opportunity: {
            id: opp.id,
            product: opp.product,
            category: opp.category,
            
            // ✅ Formato padronizado (igual à API de oportunidades)
            origin: {
              city: opp.city || 'N/A',
              state: opp.state || 'N/A'
            },
            
            destination: {
              name: opp.sellLocation || 'N/A',
              state: opp.sellLocation && opp.sellLocation.includes('-') 
                     ? opp.sellLocation.split('-').pop().trim() 
                     : 'BR'
            },
            
            financials: {
              buyPrice: buyPrice,
              sellPrice: sellPrice || null,
              freight: freight,
              roi: roi,
              currency: "BRL",
              needsCalculation: !roi || !sellPrice || !freight
            },
            
            coords: {
              lat: parseFloat(opp.lat),
              lng: parseFloat(opp.lng)
            },
            
            details: {
              volume: opp.volume || 'N/A',
              riskLevel: opp.riskLevel || 1,
              season: opp.season || null,
              isOptimized: opp.bestRoute || false
            },
            
            // Dados adicionais para compatibilidade
            priceHistory: opp.history ? opp.history.map(h => ({
              price: h.price ? parseFloat(h.price) : 0,
              date: h.createdAt
            })) : []
          }
        };
      })
    });
    
  } catch (error) {
    logger.error('❌ Erro ao buscar favoritos:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao buscar favoritos',
      message: error.message
    });
  }
});

/**
 * POST /api/favorites
 * Adiciona uma oportunidade aos favoritos
 */
router.post('/', verifyToken, async (req, res) => {
  try {
    const userId = req.user.id; // UUID do Supabase
    const { opportunityId, notes } = req.body;
    
    if (!opportunityId) {
      return res.status(400).json({
        success: false,
        error: 'opportunityId é obrigatório'
      });
    }
    
    // Verifica se a oportunidade existe
    const opportunity = await dbCircuitBreaker.execute(async () => {
      return await prisma.opportunity.findUnique({
        where: { id: parseInt(opportunityId) }
      });
    });
    
    if (!opportunity) {
      return res.status(404).json({
        success: false,
        error: 'Oportunidade não encontrada'
      });
    }
    
    // Verifica se já está favoritada
    const existing = await dbCircuitBreaker.execute(async () => {
      return await prisma.favorite.findUnique({
        where: {
          userId_opportunityId: {
            userId: userId,
            opportunityId: parseInt(opportunityId)
          }
        }
      });
    });
    
    if (existing) {
      // Se já existe, atualiza as notas se fornecidas
      if (notes !== undefined) {
        const updated = await dbCircuitBreaker.execute(async () => {
          return await prisma.favorite.update({
            where: { id: existing.id },
            data: { notes: notes || null }
          });
        });
        
        await logAction(userId, 'FAVORITE_UPDATE', `Atualizou notas do favorito ${opportunityId}`);
        
        return res.json({
          success: true,
          message: 'Favorito atualizado',
          favorite: updated
        });
      }
      
      return res.json({
        success: true,
        message: 'Oportunidade já está nos favoritos',
        favorite: existing
      });
    }
    
    // Cria novo favorito
    const favorite = await dbCircuitBreaker.execute(async () => {
      return await prisma.favorite.create({
        data: {
          userId: userId,
          opportunityId: parseInt(opportunityId),
          notes: notes || null
        },
        include: {
          opportunity: true
        }
      });
    });
    
    await logAction(userId, 'FAVORITE_CREATE', `Adicionou oportunidade ${opportunityId} aos favoritos`);
    
    logger.info(`✅ Favorito criado: ${favorite.id}`);
    
    res.status(201).json({
      success: true,
      message: 'Oportunidade adicionada aos favoritos',
      favorite: {
        id: favorite.id,
        opportunityId: favorite.opportunityId,
        notes: favorite.notes,
        createdAt: favorite.createdAt,
        opportunity: favorite.opportunity
      }
    });
    
  } catch (error) {
    logger.error('❌ Erro ao criar favorito:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao adicionar aos favoritos',
      message: error.message
    });
  }
});

/**
 * DELETE /api/favorites/:id
 * Remove um favorito
 */
router.delete('/:id', verifyToken, async (req, res) => {
  try {
    const userId = req.user.id; // UUID do Supabase
    const favoriteId = parseInt(req.params.id);
    
    // Verifica se o favorito existe e pertence ao usuário
    const favorite = await dbCircuitBreaker.execute(async () => {
      return await prisma.favorite.findUnique({
        where: { id: favoriteId }
      });
    });
    
    if (!favorite) {
      return res.status(404).json({
        success: false,
        error: 'Favorito não encontrado'
      });
    }
    
    if (favorite.userId !== userId) {
      return res.status(403).json({
        success: false,
        error: 'Você não tem permissão para remover este favorito'
      });
    }
    
    await dbCircuitBreaker.execute(async () => {
      return await prisma.favorite.delete({
        where: { id: favoriteId }
      });
    });
    
    await logAction(userId, 'FAVORITE_DELETE', `Removeu favorito ${favoriteId}`);
    
    logger.info(`✅ Favorito removido: ${favoriteId}`);
    
    res.json({
      success: true,
      message: 'Favorito removido com sucesso'
    });
    
  } catch (error) {
    logger.error('❌ Erro ao remover favorito:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao remover favorito',
      message: error.message
    });
  }
});

/**
 * DELETE /api/favorites/opportunity/:opportunityId
 * Remove favorito por opportunityId (mais conveniente)
 */
router.delete('/opportunity/:opportunityId', verifyToken, async (req, res) => {
  try {
    const userId = req.user.id; // UUID do Supabase
    const opportunityId = parseInt(req.params.opportunityId);
    
    const favorite = await dbCircuitBreaker.execute(async () => {
      return await prisma.favorite.findUnique({
        where: {
          userId_opportunityId: {
            userId: userId,
            opportunityId: opportunityId
          }
        }
      });
    });
    
    if (!favorite) {
      return res.status(404).json({
        success: false,
        error: 'Favorito não encontrado'
      });
    }
    
    await dbCircuitBreaker.execute(async () => {
      return await prisma.favorite.delete({
        where: { id: favorite.id }
      });
    });
    
    await logAction(userId, 'FAVORITE_DELETE', `Removeu favorito da oportunidade ${opportunityId}`);
    
    logger.info(`✅ Favorito removido: oportunidade ${opportunityId}`);
    
    res.json({
      success: true,
      message: 'Favorito removido com sucesso'
    });
    
  } catch (error) {
    logger.error('❌ Erro ao remover favorito:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao remover favorito',
      message: error.message
    });
  }
});

/**
 * GET /api/favorites/check/:opportunityId
 * Verifica se uma oportunidade está nos favoritos do usuário
 */
router.get('/check/:opportunityId', verifyToken, async (req, res) => {
  try {
    const userId = req.user.id; // UUID do Supabase
    const opportunityId = parseInt(req.params.opportunityId);
    
    // Verificação de segurança
    if (!prisma.favorite) {
      logger.error('❌ Modelo Favorite não disponível no Prisma Client');
      return res.json({
        success: true,
        isFavorite: false,
        favorite: null
      });
    }
    
    const favorite = await dbCircuitBreaker.execute(async () => {
      return await prisma.favorite.findUnique({
        where: {
          userId_opportunityId: {
            userId: userId,
            opportunityId: opportunityId
          }
        }
      });
    });
    
    res.json({
      success: true,
      isFavorite: !!favorite,
      favorite: favorite ? {
        id: favorite.id,
        notes: favorite.notes,
        createdAt: favorite.createdAt
      } : null
    });
    
  } catch (error) {
    logger.error('❌ Erro ao verificar favorito:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao verificar favorito',
      message: error.message
    });
  }
});

module.exports = router;

