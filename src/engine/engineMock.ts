/**
 * GameBoost AI - Engine Mock
 * Simulação do engine de performance para desenvolvimento
 */

export interface SystemSnapshot {
  cpu: {
    usage: number
    temperature: number
    cores: number
  }
  gpu: {
    usage: number
    temperature: number
    vramUsage: number
    vramTotal: number
  }
  memory: {
    usage: number
    total: number
    available: number
  }
  fps: number
  ping: number
  timestamp: Date
}

/**
 * Inicializa o engine de performance
 * Simula processo de inicialização com delay realista
 */
export async function initEngine(): Promise<void> {
  return new Promise((resolve, reject) => {
    // Simula tempo de inicialização do engine
    setTimeout(() => {
      // 95% de chance de sucesso, 5% de falha para testar error handling
      if (Math.random() > 0.05) {
        resolve()
      } else {
        reject(new Error('Falha na inicialização do engine'))
      }
    }, 1200)
  })
}

/**
 * Obtém snapshot atual do sistema
 * Retorna dados simulados realistas
 */
export function getSystemSnapshot(): SystemSnapshot {
  // Simula variações realistas nos dados
  const baseTime = Date.now()
  const variation = Math.sin(baseTime / 10000) * 0.3 + 0.7 // Oscilação suave entre 0.4 e 1.0

  return {
    cpu: {
      usage: Math.max(15, Math.min(85, 45 + (Math.random() - 0.5) * 30 * variation)),
      temperature: Math.max(50, Math.min(85, 65 + (Math.random() - 0.5) * 20 * variation)),
      cores: 12
    },
    gpu: {
      usage: Math.max(30, Math.min(95, 70 + (Math.random() - 0.5) * 40 * variation)),
      temperature: Math.max(60, Math.min(90, 72 + (Math.random() - 0.5) * 25 * variation)),
      vramUsage: Math.max(2048, Math.min(10240, 6144 + (Math.random() - 0.5) * 4096 * variation)),
      vramTotal: 12288 // 12GB
    },
    memory: {
      usage: Math.max(8192, Math.min(28672, 16384 + (Math.random() - 0.5) * 8192 * variation)),
      total: 32768, // 32GB
      available: 0 // Será calculado
    },
    fps: Math.max(60, Math.min(240, 144 + (Math.random() - 0.5) * 60 * variation)),
    ping: Math.max(8, Math.min(80, 25 + (Math.random() - 0.5) * 30 * variation)),
    timestamp: new Date()
  }
}

/**
 * Simula operação de otimização
 */
export async function performOptimization(type: string): Promise<{ success: boolean; message: string }> {
  return new Promise((resolve) => {
    // Simula tempo de processamento da otimização
    const delay = Math.random() * 400 + 800 // 800-1200ms
    
    setTimeout(() => {
      // 90% de chance de sucesso
      const success = Math.random() > 0.1
      
      if (success) {
        resolve({
          success: true,
          message: `${type} executado com sucesso!`
        })
      } else {
        resolve({
          success: false,
          message: `Falha ao executar ${type}. Tente novamente.`
        })
      }
    }, delay)
  })
}