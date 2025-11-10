/**
 * GameBoost AI - Sistema de Logs
 * Utilitário para registrar ações de otimização
 */

export interface LogEntry {
  timestamp: string
  message: string
  type: 'info' | 'success' | 'warning' | 'error'
}

class Logger {
  private logs: LogEntry[] = []
  private maxLogs = 100

  /**
   * Adiciona uma entrada de log
   */
  log(message: string, type: 'info' | 'success' | 'warning' | 'error' = 'info'): void {
    const timestamp = new Date().toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })

    const entry: LogEntry = {
      timestamp,
      message,
      type
    }

    this.logs.push(entry)

    // Manter apenas os últimos logs
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs)
    }

    // Log no console para debug
    console.log(`[${timestamp}] ${message}`)
  }

  /**
   * Obtém todos os logs
   */
  getLogs(): LogEntry[] {
    return [...this.logs]
  }

  /**
   * Obtém logs formatados como strings
   */
  getFormattedLogs(): string[] {
    return this.logs.map(entry => `[${entry.timestamp}] ${entry.message}`)
  }

  /**
   * Limpa todos os logs
   */
  clearLogs(): void {
    this.logs = []
  }

  /**
   * Obtém logs recentes (últimos N)
   */
  getRecentLogs(count: number = 10): LogEntry[] {
    return this.logs.slice(-count)
  }
}

// Instância singleton do logger
export const logger = new Logger()

/**
 * Função utilitária para log simples
 */
export function log(message: string, type: 'info' | 'success' | 'warning' | 'error' = 'info'): void {
  logger.log(message, type)
}