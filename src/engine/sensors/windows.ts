/**
 * GameBoost AI - Provider de Sensores Windows
 * Implementação real para ambiente Electron/Node.js
 */

import type { Snapshot } from './types'
import { safeTmpDir } from '../util/tmpdir'

export async function init() {
  // Inicialização para ambiente Windows - preparar ferramentas se necessário
}

export async function getSnapshot(): Promise<Snapshot> {
  try {
    const osMod = await import('os');
    const util = await import('util');
    const child = await import('child_process');
    const execFile = (util as any).promisify((child as any).execFile);
    const tmpDir = await safeTmpDir();

    const cpuName = (osMod as any).cpus?.()?.[0]?.model;
    const ramUsedPct = Math.round((1 - (osMod as any).freemem() / (osMod as any).totalmem()) * 100);

    let gpuName: string | undefined;
    try {
      await execFile('dxdiag', ['/t', `${tmpDir}\\dx.txt`], { windowsHide: true });
      // parsing opcional depois
    } catch {}

    return { cpu:{ name: cpuName }, gpu:{ name: gpuName }, ramUsedPct, fps: undefined };
  } catch {
    return { cpu:{ name:'Unknown' }, gpu:{}, ramUsedPct: undefined, fps: undefined };
  }
}