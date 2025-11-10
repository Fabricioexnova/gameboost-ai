/**
 * GameBoost AI - Utilitário de Diretório Temporário Seguro
 * Obtém diretório temporário sem depender de variáveis de ambiente
 */

export async function safeTmpDir(): Promise<string> {
  try {
    const osMod = await import('os');
    const fn = (osMod as any).tmpdir || (osMod as any).default?.tmpdir;
    const dir = typeof fn === 'function' ? fn.call(osMod) : null;
    return (dir && String(dir)) || 'C:\\Windows\\Temp';
  } catch {
    return 'C:\\Windows\\Temp';
  }
}