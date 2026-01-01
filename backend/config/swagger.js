// backend/config/swagger.js
// ✅ FEAT-001: Configuração do Swagger/OpenAPI

const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Agro-AI Backend API',
      version: '1.0.0',
      description: 
        '## 🧠 API de Inteligência Agrícola\n\n' +
        'Sistema completo de análise e predição para agricultura, incluindo:\n\n' +
        '- **Oportunidades de Mercado**: Análise de ROI, arbitragem interestadual\n' +
        '- **Inteligência Climática**: Previsões, eventos extremos, risco de abastecimento\n' +
        '- **IA e Recomendações**: Análise de armazenagem, recomendações automáticas\n' +
        '- **Analytics**: Tendências de preços, tendências de mercado\n' +
        '- **Calculadoras**: ROI de produção, arbitragem\n\n' +
        '### Autenticação\n\n' +
        'Todas as rotas (exceto /health e /) requerem autenticação via Bearer Token.\n' +
        'Obtenha o token através do endpoint /api/auth/login.\n\n' +
        '### Códigos de Status\n\n' +
        '- 200: Sucesso\n' +
        '- 400: Dados inválidos (validação falhou)\n' +
        '- 401: Não autenticado\n' +
        '- 403: Não autorizado (sem permissão)\n' +
        '- 404: Recurso não encontrado\n' +
        '- 500: Erro interno do servidor\n' +
        '- 503: Serviço indisponível\n' +
        '- 504: Timeout (serviço demorou muito para responder)',
      contact: {
        name: 'Agro-AI Team',
        email: 'support@agro-ai.com'
      },
      license: {
        name: 'ISC',
        url: 'https://opensource.org/licenses/ISC'
      }
    },
    servers: [
      {
        url: process.env.API_BASE_URL || 'http://localhost:3001',
        description: 'Servidor de desenvolvimento'
      },
      {
        url: process.env.RAILWAY_STATIC_URL || 'https://api.agro-ai.com',
        description: 'Servidor de produção'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Token JWT obtido via /api/auth/login'
        }
      },
      schemas: {
        Error: {
          type: 'object',
          properties: {
            error: {
              type: 'object',
              properties: {
                type: {
                  type: 'string',
                  enum: [
                    'VALIDATION_ERROR',
                    'NOT_FOUND',
                    'UNAUTHORIZED',
                    'FORBIDDEN',
                    'TIMEOUT',
                    'EXTERNAL_SERVICE_ERROR',
                    'DATABASE_ERROR',
                    'INTERNAL_ERROR'
                  ],
                  description: 'Tipo do erro'
                },
                message: {
                  type: 'string',
                  description: 'Mensagem de erro amigável'
                },
                details: {
                  type: 'object',
                  description: 'Detalhes adicionais do erro (apenas em desenvolvimento)'
                },
                timestamp: {
                  type: 'string',
                  format: 'date-time',
                  description: 'Timestamp do erro'
                }
              },
              required: ['type', 'message', 'timestamp']
            }
          }
        },
        Opportunity: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            product: { type: 'string', example: 'Tomate' },
            category: { type: 'string', example: 'Hortifruti' },
            city: { type: 'string', example: 'Sorriso' },
            state: { type: 'string', example: 'MT' },
            lat: { type: 'number', format: 'float' },
            lng: { type: 'number', format: 'float' },
            buyPrice: { type: 'number', format: 'float' },
            sellPrice: { type: 'number', format: 'float' },
            sellLocation: { type: 'string' },
            destLat: { type: 'number', format: 'float' },
            destLng: { type: 'number', format: 'float' },
            roi: { type: 'number', format: 'float' },
            freight: { type: 'number', format: 'float' },
            riskLevel: { type: 'string', enum: ['low', 'medium', 'high'] },
            volume: { type: 'number', format: 'float' },
            season: { type: 'string' },
            createdAt: { type: 'string', format: 'date-time' }
          }
        },
        WeatherForecast: {
          type: 'object',
          properties: {
            status: { type: 'string', example: 'success' },
            data: {
              type: 'object',
              properties: {
                time: { type: 'array', items: { type: 'string' } },
                temp_max: { type: 'array', items: { type: 'number' } },
                temp_min: { type: 'array', items: { type: 'number' } },
                rain_sum: { type: 'array', items: { type: 'number' } }
              }
            },
            source: { type: 'string', example: 'Open-Meteo (16 Days)' }
          }
        },
        Recommendation: {
          type: 'object',
          properties: {
            action: {
              type: 'string',
              enum: ['BUY', 'DON\'T BUY', 'WAIT'],
              description: 'Ação recomendada pela IA'
            },
            projected_profit: {
              type: 'number',
              format: 'float',
              description: 'Lucro projetado em R$'
            },
            best_day_date: {
              type: 'string',
              format: 'date',
              description: 'Melhor dia para compra'
            },
            confidence_score: {
              type: 'number',
              format: 'float',
              minimum: 0,
              maximum: 100,
              description: 'Nível de confiança da recomendação (0-100)'
            },
            risk_event: {
              type: 'string',
              nullable: true,
              description: 'Evento de risco identificado'
            }
          }
        }
      },
      responses: {
        Error: {
          description: 'Erro na requisição',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error'
              }
            }
          }
        }
      }
    },
    security: [
      {
        bearerAuth: []
      }
    ]
  },
  apis: [
    './server.js',
    './routes/*.js',
    './controllers/*.js'
  ]
};

const swaggerSpec = swaggerJsdoc(options);

module.exports = {
  swaggerSpec,
  swaggerUi
};

