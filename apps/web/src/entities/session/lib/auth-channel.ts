/**
 * Tablar orasida auth signali: bir tabda chiqilsa — boshqa tablarda ham kesh tozalanadi va login'ga o‘tiladi.
 * BroadcastChannel xabari shu tabdagi boshqa kanal obyektlariga ham yetadi — shuning uchun har xabarda
 * tab identifikatori bor va o‘z xabarlarimiz e’tiborsiz qoldiriladi (aks holda `?next=` yo‘qolar edi).
 */
export type AuthMessage = { type: 'logout' } | { type: 'login' }
type Envelope = AuthMessage & { from: string }

const NAME = 'nm-admin-auth'
const TAB_ID = typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : String(Math.random())

export function postAuthMessage(msg: AuthMessage) {
  if (typeof BroadcastChannel === 'undefined') return
  const ch = new BroadcastChannel(NAME)
  ch.postMessage({ ...msg, from: TAB_ID } satisfies Envelope)
  ch.close()
}

export function subscribeAuthMessages(fn: (msg: AuthMessage) => void): () => void {
  if (typeof BroadcastChannel === 'undefined') return () => {}
  const ch = new BroadcastChannel(NAME)
  ch.onmessage = (e: MessageEvent<Envelope>) => {
    if (e.data?.from === TAB_ID) return
    fn({ type: e.data.type })
  }
  return () => ch.close()
}
