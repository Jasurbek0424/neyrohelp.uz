import { create } from 'zustand'

/** SSE oqimi ulanganmi: ulangan bo‘lsa ariza so‘rovlari polling qilmaydi, uzilsa zaxira polling yoqiladi */
export const useLeadLive = create<{ connected: boolean }>(() => ({ connected: false }))

export const setLeadLive = (connected: boolean) => useLeadLive.setState({ connected })

/** `refetchInterval` uchun: har fetch'dan keyin qayta hisoblanadi */
export const pollWhenOffline = (ms: number) => () => (useLeadLive.getState().connected ? false : ms)
