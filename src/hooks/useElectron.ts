// 'use client'

type W = (Window & { backend?: { runPS?: (s: string) => Promise<string> } }) | any

export function isDesktop(): boolean {
  const w: W = typeof window !== 'undefined' ? (window as any) : {}
  return !!w.backend?.runPS
}

// flag booleana para quem usa como valor
export const isDesktopFlag: boolean =
  typeof window !== 'undefined' ? !!(window as any)?.backend?.runPS : false

export function useElectron() {
  const w: W = typeof window !== 'undefined' ? (window as any) : {}
  return {
    // manter ambos para compatibilidade
    isDesktop: isDesktop(),
    isDesktopFlag,
    runPS: async (script: string) => {
      if (w.backend?.runPS) return w.backend.runPS(script)
      // fallback no preview web
      return '(preview) runPS not available'
    },
  }
}

export default useElectron