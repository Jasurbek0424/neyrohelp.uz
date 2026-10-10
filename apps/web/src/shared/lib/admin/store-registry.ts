/**
 * Zustand store'lar registri: logout / sessiya tugaganda hammasi bitta chaqiriq bilan tozalanadi.
 * Har store yaratilganda `registerStoreReset(() => useX.getState().reset())` chaqiradi.
 */
const resets = new Set<() => void>()

export function registerStoreReset(fn: () => void): () => void {
  resets.add(fn)
  return () => resets.delete(fn)
}

export function resetAllStores() {
  for (const fn of resets) {
    try {
      fn()
    } catch {
      /* bitta store xatosi boshqalarini to‘xtatmasin */
    }
  }
}
