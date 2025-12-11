// backend/utils/circuitBreaker.js
/**
 * Circuit Breaker Pattern
 * Protege contra sobrecarga quando pool está esgotado
 */

class CircuitBreaker {
  constructor(threshold = 5, timeout = 60000) {
    this.failures = 0;
    this.threshold = threshold;
    this.timeout = timeout;
    this.state = 'CLOSED'; // CLOSED, OPEN, HALF_OPEN
    this.nextAttempt = Date.now();
    this.lastFailure = null;
  }

  async execute(fn) {
    // Circuit está aberto - rejeita imediatamente
    if (this.state === 'OPEN') {
      if (Date.now() < this.nextAttempt) {
        const waitTime = Math.ceil((this.nextAttempt - Date.now()) / 1000);
        throw new Error(
          `Circuit breaker is OPEN. Pool may be exhausted. Retry in ${waitTime}s.`
        );
      }
      // Timeout passou, tenta novamente (HALF_OPEN)
      this.state = 'HALF_OPEN';
      console.log('🟡 Circuit breaker: Tentando reconexão (HALF_OPEN)');
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure(error);
      throw error;
    }
  }

  onSuccess() {
    if (this.state === 'HALF_OPEN') {
      console.log('🟢 Circuit breaker: Reconexão bem-sucedida (CLOSED)');
    }
    this.failures = 0;
    this.state = 'CLOSED';
  }

  onFailure(error) {
    this.failures++;
    this.lastFailure = error.message;
    
    // Detecta se é erro de pool esgotado ou conexão
    const isPoolError = error.message?.toLowerCase().includes('maxclients') ||
                       error.message?.toLowerCase().includes('max clients') ||
                       error.message?.toLowerCase().includes('pool') ||
                       error.message?.toLowerCase().includes("can't reach database") ||
                       error.message?.toLowerCase().includes('server has closed the connection') ||
                       error.code === 'P1001' || // Prisma connection error
                       error.code === 'P1000' || // Prisma authentication error
                       error.code === 'P1017';   // Prisma server closed connection
    
    // Abre circuit breaker mais rapidamente para erros de conexão
    const threshold = isPoolError ? 3 : this.threshold;
    
    if (this.failures >= threshold) {
      this.state = 'OPEN';
      this.nextAttempt = Date.now() + this.timeout;
      console.error(
        `🔴 Circuit breaker: ABERTO após ${this.failures} falhas (threshold: ${threshold}). ` +
        `Tentará novamente em ${this.timeout / 1000}s. ` +
        `Último erro: ${error.message?.substring(0, 100)}`
      );
    } else {
      console.warn(
        `⚠️ Circuit breaker: ${this.failures}/${threshold} falhas. ` +
        `Erro: ${error.message?.substring(0, 80)}`
      );
    }
  }

  getState() {
    return {
      state: this.state,
      failures: this.failures,
      nextAttempt: this.state === 'OPEN' ? new Date(this.nextAttempt).toISOString() : null,
      lastFailure: this.lastFailure
    };
  }

  reset() {
    this.failures = 0;
    this.state = 'CLOSED';
    this.nextAttempt = Date.now();
    this.lastFailure = null;
    console.log('🔄 Circuit breaker: RESETADO');
  }
}

// Instância global para uso em toda aplicação
const dbCircuitBreaker = new CircuitBreaker(5, 60000); // 5 falhas, 60s timeout

module.exports = { CircuitBreaker, dbCircuitBreaker };
