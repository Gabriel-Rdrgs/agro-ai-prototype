// backend/utils/jobQueue.js
/**
 * Sistema simples de jobs em background (sem Redis)
 * URGENTE: Performance - ETL não deve bloquear requests
 */

class JobQueue {
  constructor() {
    this.jobs = new Map();
    this.running = new Set();
    console.log('✅ JobQueue iniciado');
  }

  /**
   * Cria um novo job e retorna ID
   */
  createJob(type, data = {}) {
    const jobId = `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    this.jobs.set(jobId, {
      id: jobId,
      type,
      status: 'pending',
      progress: 0,
      data,
      result: null,
      error: null,
      createdAt: new Date(),
      startedAt: null,
      completedAt: null
    });

    console.log(`📋 Job criado: ${jobId} (${type})`);
    return jobId;
  }

  /**
   * Inicia execução do job em background
   */
  async startJob(jobId, executor) {
    const job = this.jobs.get(jobId);
    if (!job) {
      throw new Error(`Job ${jobId} não encontrado`);
    }

    if (this.running.has(jobId)) {
      throw new Error(`Job ${jobId} já está em execução`);
    }

    this.running.add(jobId);
    job.status = 'running';
    job.startedAt = new Date();

    // Executa em background (não bloqueia)
    setImmediate(async () => {
      try {
        console.log(`🚀 Iniciando job ${jobId} em background...`);
        
        // Executa a função passada
        const result = await executor(job);
        
        job.status = 'completed';
        job.progress = 100;
        job.result = result;
        job.completedAt = new Date();
        
        console.log(`✅ Job ${jobId} concluído com sucesso`);
      } catch (error) {
        job.status = 'failed';
        job.error = error.message;
        job.completedAt = new Date();
        
        console.error(`❌ Job ${jobId} falhou:`, error.message);
      } finally {
        this.running.delete(jobId);
      }
    });

    return jobId;
  }

  /**
   * Atualiza progresso do job
   */
  updateProgress(jobId, progress, message = null) {
    const job = this.jobs.get(jobId);
    if (job) {
      job.progress = Math.min(100, Math.max(0, progress));
      if (message) {
        job.data.message = message;
      }
    }
  }

  /**
   * Busca status do job
   */
  getJob(jobId) {
    return this.jobs.get(jobId);
  }

  /**
   * Lista todos os jobs (últimos 50)
   */
  listJobs(limit = 50) {
    const jobs = Array.from(this.jobs.values())
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, limit);
    
    return jobs;
  }

  /**
   * Remove jobs antigos (mais de 1 hora)
   */
  cleanup() {
    const oneHourAgo = new Date(Date.now() - 3600000);
    let cleaned = 0;

    for (const [jobId, job] of this.jobs.entries()) {
      if (job.completedAt && job.completedAt < oneHourAgo) {
        this.jobs.delete(jobId);
        this.running.delete(jobId);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      console.log(`🧹 ${cleaned} jobs antigos removidos`);
    }

    return cleaned;
  }
}

// Instância global (singleton)
const jobQueue = new JobQueue();

// Limpeza automática a cada 10 minutos
setInterval(() => {
  jobQueue.cleanup();
}, 600000);

module.exports = jobQueue;



