// routes/portfolio.js
// ✅ NOVO: Portfolio Tracking - Rastreamento de operações de compra/venda

const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const logger = require('../utils/logger');
const { verifyToken } = require('../authMiddleware');

// GET /api/portfolio/operations - Lista operações do portfolio do usuário
router.get('/operations', verifyToken, async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Usuário não autenticado' });
    }

    const { status, type } = req.query;
    const where = { userId };
    if (status) where.status = status;
    if (type) where.type = type;

    const operations = await prisma.portfolioOperation.findMany({
      where,
      include: {
        opportunity: {
          select: {
            id: true,
            product: true,
            state: true,
            city: true,
            roi: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json(operations);
  } catch (error) {
    logger.error('❌ Erro ao listar operações do portfolio:', error);
    res.status(500).json({ error: 'Erro ao listar operações' });
  }
});

// GET /api/portfolio/stats - Estatísticas do portfolio
router.get('/stats', verifyToken, async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Usuário não autenticado' });
    }

    const operations = await prisma.portfolioOperation.findMany({
      where: { userId }
    });

    const completed = operations.filter(op => op.status === 'completed');
    const inProgress = operations.filter(op => op.status === 'in_progress');
    const planned = operations.filter(op => op.status === 'planned');

    // Calcula estatísticas
    let totalProfit = 0;
    let totalInvested = 0;
    let successCount = 0;
    let bestOperation = null;
    let worstOperation = null;

    completed.forEach(op => {
      if (op.type === 'buy') {
        totalInvested += op.totalValue;
      } else if (op.type === 'sell') {
        totalProfit += op.totalValue;
      }

      if (op.actualROI !== null && op.projectedROI !== null) {
        if (op.actualROI >= op.projectedROI) {
          successCount++;
        }

        if (!bestOperation || op.actualROI > bestOperation.actualROI) {
          bestOperation = op;
        }
        if (!worstOperation || op.actualROI < worstOperation.actualROI) {
          worstOperation = op;
        }
      }
    });

    const successRate = completed.length > 0 
      ? (successCount / completed.length) * 100 
      : 0;

    const netProfit = totalProfit - totalInvested;

    res.json({
      total: operations.length,
      completed: completed.length,
      inProgress: inProgress.length,
      planned: planned.length,
      totalInvested: parseFloat(totalInvested.toFixed(2)),
      totalProfit: parseFloat(totalProfit.toFixed(2)),
      netProfit: parseFloat(netProfit.toFixed(2)),
      successRate: parseFloat(successRate.toFixed(1)),
      bestOperation: bestOperation ? {
        id: bestOperation.id,
        product: bestOperation.product,
        actualROI: bestOperation.actualROI,
        netProfit: bestOperation.totalValue - (bestOperation.quantity * (bestOperation.price / (1 + (bestOperation.actualROI || 0) / 100))))
      } : null,
      worstOperation: worstOperation ? {
        id: worstOperation.id,
        product: worstOperation.product,
        actualROI: worstOperation.actualROI
      } : null
    });
  } catch (error) {
    logger.error('❌ Erro ao calcular estatísticas do portfolio:', error);
    res.status(500).json({ error: 'Erro ao calcular estatísticas' });
  }
});

// POST /api/portfolio/operations - Cria nova operação
router.post('/operations', verifyToken, async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Usuário não autenticado' });
    }

    const {
      opportunityId,
      type,
      product,
      origin,
      destination,
      quantity,
      price,
      projectedROI,
      status = 'planned',
      notes
    } = req.body;

    if (!type || !product || !origin || !destination || !quantity || !price) {
      return res.status(400).json({ error: 'Campos obrigatórios: type, product, origin, destination, quantity, price' });
    }

    if (!['buy', 'sell'].includes(type)) {
      return res.status(400).json({ error: 'type deve ser "buy" ou "sell"' });
    }

    const totalValue = quantity * price;

    const operation = await prisma.portfolioOperation.create({
      data: {
        userId,
        opportunityId: opportunityId || null,
        type,
        product,
        origin,
        destination,
        quantity: parseFloat(quantity),
        price: parseFloat(price),
        totalValue: parseFloat(totalValue),
        projectedROI: projectedROI ? parseFloat(projectedROI) : null,
        status,
        notes: notes || null
      },
      include: {
        opportunity: true
      }
    });

    logger.info(`✅ Operação criada: ${type} - ${product} - ${operation.id}`);

    res.status(201).json(operation);
  } catch (error) {
    logger.error('❌ Erro ao criar operação:', error);
    res.status(500).json({ error: 'Erro ao criar operação' });
  }
});

// PATCH /api/portfolio/operations/:id - Atualiza operação
router.patch('/operations/:id', verifyToken, async (req, res) => {
  try {
    const userId = req.user?.id;
    const operationId = parseInt(req.params.id, 10);

    if (!userId) {
      return res.status(401).json({ error: 'Usuário não autenticado' });
    }

    // Verifica se a operação pertence ao usuário
    const existingOperation = await prisma.portfolioOperation.findFirst({
      where: { id: operationId, userId }
    });

    if (!existingOperation) {
      return res.status(404).json({ error: 'Operação não encontrada' });
    }

    const {
      type,
      quantity,
      price,
      actualROI,
      status,
      notes
    } = req.body;

    const updateData = {};
    if (type) updateData.type = type;
    if (quantity) {
      updateData.quantity = parseFloat(quantity);
      if (price) {
        updateData.totalValue = parseFloat(quantity) * parseFloat(price);
      }
    }
    if (price) {
      updateData.price = parseFloat(price);
      if (quantity) {
        updateData.totalValue = parseFloat(quantity) * parseFloat(price);
      } else {
        updateData.totalValue = existingOperation.quantity * parseFloat(price);
      }
    }
    if (actualROI !== undefined) updateData.actualROI = parseFloat(actualROI);
    if (status) {
      updateData.status = status;
      if (status === 'completed' && !existingOperation.completedAt) {
        updateData.completedAt = new Date();
      }
    }
    if (notes !== undefined) updateData.notes = notes;

    const updatedOperation = await prisma.portfolioOperation.update({
      where: { id: operationId },
      data: updateData,
      include: {
        opportunity: true
      }
    });

    logger.info(`✅ Operação atualizada: ${operationId}`);

    res.json(updatedOperation);
  } catch (error) {
    logger.error('❌ Erro ao atualizar operação:', error);
    res.status(500).json({ error: 'Erro ao atualizar operação' });
  }
});

// DELETE /api/portfolio/operations/:id - Remove operação
router.delete('/operations/:id', verifyToken, async (req, res) => {
  try {
    const userId = req.user?.id;
    const operationId = parseInt(req.params.id, 10);

    if (!userId) {
      return res.status(401).json({ error: 'Usuário não autenticado' });
    }

    // Verifica se a operação pertence ao usuário
    const existingOperation = await prisma.portfolioOperation.findFirst({
      where: { id: operationId, userId }
    });

    if (!existingOperation) {
      return res.status(404).json({ error: 'Operação não encontrada' });
    }

    await prisma.portfolioOperation.delete({
      where: { id: operationId }
    });

    logger.info(`✅ Operação removida: ${operationId}`);

    res.json({ success: true, message: 'Operação removida com sucesso' });
  } catch (error) {
    logger.error('❌ Erro ao remover operação:', error);
    res.status(500).json({ error: 'Erro ao remover operação' });
  }
});

module.exports = router;

