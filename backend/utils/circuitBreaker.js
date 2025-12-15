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
    
    // Detecta se é erro de pool esgotado
    const isPoolError = error.message?.toLowerCase().includes('maxclients') ||
                       error.message?.toLowerCase().includes('max clients') ||
                       error.message?.toLowerCase().includes('pool');
    
    if (isPoolError && this.failures >= this.threshold) {
      this.state = 'OPEN';
      this.nextAttempt = Date.now() + this.timeout;
      console.error(
        `🔴 Circuit breaker: ABERTO após ${this.failures} falhas. ` +
        `Tentará novamente em ${this.timeout / 1000}s`
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
