'use client'

import { useEffect, useRef } from 'react'

/**
 * Logo shaklidagi nuqtalar (qo‘l + bosh + miya).
 * - kirish: sochilgan nuqtalar avval zich, burmali katta miyaga yig‘iladi (neyronlar tasodifiy yonib turadi),
 *   so‘ng miya logoga aylanadi — qo‘l va bosh nuqtalari yoy bo‘ylab o‘z joyiga uchadi, ortiqcha nuqtalar so‘nadi
 * - logodagi miyada ko‘rinmas neyron grafi bo‘ylab coral impulslar sakraydi
 * - sichqoncha yaqinidagi nuqtalar biroz chetga suriladi; bosilganda transformatsiya qaytadan o‘ynaydi
 * Unumdorlik: nuqtalar ma'lumoti alohida chunk (dinamik import); bitta canvas, rang × shaffoflik bo‘yicha
 * guruhlab chiziladi (~15 fill/kadr); ekrandan tashqarida yoki tab yashirin bo‘lsa to‘xtaydi;
 * reduced-motion'da bitta statik kadr (tayyor logo).
 */

const SPARK = '#e4572e'
type Palette = {
  colors: readonly string[]
  ambient: number
  ambientAlpha: number
}
/** colors (logo ranglari): 1 qo‘l, 2 bosh, 3 miya, 4 coral (fondagi nuqtalar). Katta miyada: 1 chet, 2 o‘rta, 3 markaz */
const PALETTES: Record<'light' | 'dark', Palette> = {
  light: {
    colors: ['', '#1f3f8f', '#2f8fd8', '#4fa3e0', SPARK],
    ambient: 36,
    ambientAlpha: 0.22,
  },
  dark: {
    colors: ['', '#8fa8f0', '#7fc0ee', '#d6ecfb', SPARK],
    ambient: 70,
    ambientAlpha: 0.3,
  },
}
/** Logo nuqtalari miltillash darajalari */
const ALPHAS = [0.6, 0.82, 1] as const
const LINK_DIST = 0.03 // impulslar uchun miya grafi: qo‘shni nuqtalar masofasi (logo o‘lchamiga nisbatan)
const REPEL_RADIUS = 70
const MAX_PULSES = 6
const ASSEMBLE_MS = 1500 // sochilgan → katta miya
const MORPH_AT = 2900 // katta miya → logo boshlanishi
const MORPH_MS = 1700

type Particle = {
  logo: boolean
  extra: boolean // faqat katta miya bosqichida bor, transformatsiyada so‘nadi
  ux: number // logo: 0..1 logo qutisida; fon: 0..1 canvas
  uy: number
  bx: number // katta miya bosqichidagi joy, 0..1 logo qutisida
  by: number
  color: number
  bcolor: number // katta miya bosqichidagi rang (hajm qatlami)
  sx: number // boshlang‘ich (sochilgan) nuqta, 0..1 canvas
  sy: number
  delay: number
  mdelay: number // miya → logo kechikishi
  arc: number // transformatsiyadagi yoy kattaligi (ishora — yo‘nalish)
  size: number
  phase: number
  vx: number
  vy: number
  offX: number // sichqoncha ta'siridagi siljish (prujina bilan qaytadi)
  offY: number
  glow: number // impuls o‘tganda 1, keyin so‘nadi
  morph: number // 0 — miya, 1 — logo (joriy kadr)
  x: number // joriy kadrdagi pozitsiya, px
  y: number
  links: Particle[]
}
type Pulse = {
  from: Particle
  to: Particle
  t: number
  speed: number
  hops: number
}

const rnd = (a: number, b: number) => a + Math.random() * (b - a)
const pick = <T,>(list: readonly T[]): T | undefined => list[Math.floor(Math.random() * list.length)]
const clamp01 = (t: number) => Math.min(1, Math.max(0, t))
const easeOut = (t: number) => 1 - (1 - t) ** 3
const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2)

type Point = { x: number; y: number; c: number }
const unpack = (data: Uint16Array): Point[] => {
  const out: Point[] = []
  for (let i = 0; i + 2 < data.length; i += 3)
    out.push({
      x: (data[i] ?? 0) / 1000,
      y: (data[i + 1] ?? 0) / 1000,
      c: data[i + 2] ?? 1,
    })
  return out
}
/** Markaz atrofidagi burchak bo‘yicha tartib — miya va logo nuqtalari shu tartibda juftlanadi (harakat izchil bo‘lsin) */
const byAngle = (list: Point[]) => {
  const cx = list.reduce((s, p) => s + p.x, 0) / (list.length || 1)
  const cy = list.reduce((s, p) => s + p.y, 0) / (list.length || 1)
  return list
    .map((p) => ({ p, a: Math.atan2(p.y - cy, p.x - cx) }))
    .sort((a, b) => a.a - b.a)
    .map((e) => e.p)
}

function createParticles(logoData: Uint16Array, brainData: Uint16Array, ambient: number): Particle[] {
  const list: Particle[] = []
  const base = {
    offX: 0,
    offY: 0,
    glow: 0,
    morph: 0,
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    bx: 0.5,
    by: 0.5,
    mdelay: 0,
    arc: 0,
    extra: false,
  }
  const logoPts = byAngle(unpack(logoData))
  const brainPts = byAngle(unpack(brainData))
  // Logo va miya nuqtalari burchak tartibida teng oraliq bilan juftlanadi; miya nuqtalari ortib qolsa —
  // «ortiqcha» nuqtalar, kam bo‘lsa — bitta miya nuqtasiga bir nechta logo nuqtasi (biroz siljitib)
  const ratio = brainPts.length / (logoPts.length || 1)
  const taken = new Set<number>()
  logoPts.forEach((lp, i) => {
    const bi = Math.min(brainPts.length - 1, Math.floor(i * ratio))
    taken.add(bi)
    const bp = brainPts[bi]
    const cls = lp.c
    list.push({
      ...base,
      logo: true,
      ux: lp.x,
      uy: lp.y,
      bx: (bp?.x ?? 0.5) + rnd(-0.004, 0.004),
      by: (bp?.y ?? 0.5) + rnd(-0.004, 0.004),
      color: cls,
      bcolor: bp?.c ?? 3,
      sx: rnd(-0.1, 1.1),
      sy: rnd(-0.1, 1.1),
      delay: rnd(0, 600),
      size: rnd(1.15, 1.85),
      phase: rnd(0, Math.PI * 2),
      links: [],
    })
  })
  brainPts.forEach((bp, bi) => {
    if (taken.has(bi)) return
    const lp = logoPts[Math.min(logoPts.length - 1, Math.floor(bi / ratio))]
    list.push({
      ...base,
      logo: true,
      extra: true,
      ux: (lp?.x ?? 0.5) + rnd(-0.01, 0.01),
      uy: (lp?.y ?? 0.5) + rnd(-0.01, 0.01),
      bx: bp.x,
      by: bp.y,
      color: lp?.c ?? 3,
      bcolor: bp.c,
      sx: rnd(-0.1, 1.1),
      sy: rnd(-0.1, 1.1),
      delay: rnd(0, 600),
      size: rnd(1.15, 1.85),
      phase: rnd(0, Math.PI * 2),
      links: [],
    })
  })
  for (let i = 0; i < ambient; i++) {
    list.push({
      ...base,
      logo: false,
      ux: Math.random(),
      uy: Math.random(),
      color: Math.random() < 0.15 ? 4 : 1 + Math.floor(Math.random() * 3),
      bcolor: 0,
      sx: rnd(-0.1, 1.1),
      sy: rnd(-0.1, 1.1),
      delay: rnd(0, 600),
      size: rnd(0.9, 1.7),
      phase: rnd(0, Math.PI * 2),
      vx: rnd(-0.004, 0.004),
      vy: rnd(-0.006, -0.001),
      links: [],
    })
  }

  // Transformatsiya tartibi: logodagi miya birinchi, keyin markazdan uzoqdagi nuqtalar (qo‘l pastki uchi oxirida)
  const brain = list.filter((p) => p.logo && !p.extra && p.color === 3)
  const cx = brain.reduce((s, p) => s + p.ux, 0) / (brain.length || 1)
  const cy = brain.reduce((s, p) => s + p.uy, 0) / (brain.length || 1)
  for (const p of list) {
    if (!p.logo) continue
    const far = Math.hypot(p.ux - cx, p.uy - cy)
    p.mdelay = p.color === 3 ? rnd(0, 250) : 150 + far * 700 + rnd(0, 250)
    p.arc = p.color === 3 ? 0 : (p.ux < cx ? -1 : 1) * rnd(0.03, 0.08)
  }

  // Miya grafi: yaqin qo‘shnilar (bir marta)
  const lim = LINK_DIST * LINK_DIST
  brain.forEach((a, ai) => {
    for (const b of brain.slice(ai + 1)) {
      if ((a.ux - b.ux) ** 2 + (a.uy - b.uy) ** 2 < lim) {
        a.links.push(b)
        b.links.push(a)
      }
    }
  })
  return list
}

/** `className` joylashuvni to‘liq beradi (masalan `absolute inset-0`); `tone` — fon rangi (oq yoki navy) */
export function NeuroConstellation({ className = 'relative', tone = 'light' }: { className?: string; tone?: 'light' | 'dark' }) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    let cleanup: (() => void) | undefined
    let cancelled = false
    void import('./points').then((data) => {
      if (!cancelled) cleanup = run(data)
    })
    return () => {
      cancelled = true
      cleanup?.()
    }

    function run(data: typeof import('./points')) {
      const wrap = wrapRef.current
      const canvas = canvasRef.current
      const ctx = canvas?.getContext('2d')
      if (!wrap || !canvas || !ctx) return
      const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      const palette = PALETTES[tone]

      const particles = createParticles(data.LOGO_POINTS, data.BRAIN_POINTS, palette.ambient)
      const hubs = particles.filter((p) => p.links.length > 1)
      const pulses: Pulse[] = []

      // ───── O‘lcham ─────
      let w = 0
      let h = 0
      let box = 0
      let ox = 0
      let oy = 0
      const resize = () => {
        const r = wrap.getBoundingClientRect()
        const dpr = Math.min(window.devicePixelRatio || 1, 2)
        w = r.width
        h = r.height
        canvas.width = Math.round(w * dpr)
        canvas.height = Math.round(h * dpr)
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
        box = Math.min(w, h) * 0.9
        ox = (w - box) / 2
        oy = (h - box) / 2
      }

      // ───── Sichqoncha ─────
      let px = -1e4
      let py = -1e4
      const onMove = (e: PointerEvent) => {
        const r = canvas.getBoundingClientRect()
        px = e.clientX - r.left
        py = e.clientY - r.top
      }
      const onLeave = () => {
        px = py = -1e4
      }

      const dot = (x: number, y: number, r: number) => {
        ctx.moveTo(x + r, y)
        ctx.arc(x, y, r, 0, Math.PI * 2)
      }

      let start = 0
      let last = 0
      let pulseClock = 0

      // Bosilganda: nuqtalar joriy joyidan qaytadan miyaga yig‘ilib, yana logoga aylanadi
      const replay = () => {
        if (!w || !h) return
        for (const p of particles) {
          p.sx = p.x / w
          p.sy = p.y / h
          p.delay = rnd(0, 400)
        }
        pulses.length = 0
        start = 0
        kick()
      }

      const frame = (now: number) => {
        if (!start) start = now
        const dt = Math.min(0.05, last ? (now - last) / 1000 : 0)
        last = now
        const time = (now - start) / 1000
        const elapsed = reduced ? Infinity : now - start
        ctx.clearRect(0, 0, w, h)

        // Pozitsiyalar
        for (const p of particles) {
          const prog = clamp01((elapsed - p.delay) / ASSEMBLE_MS)
          if (!p.logo && !reduced) {
            p.ux = (p.ux + p.vx * dt + 1) % 1
            p.uy = (p.uy + p.vy * dt + 1) % 1
          }
          let tx: number
          let ty: number
          if (p.logo) {
            const m = easeInOut(clamp01((elapsed - MORPH_AT - p.mdelay) / MORPH_MS))
            p.morph = m
            // miya → logo, yo‘l o‘rtasida yon tomonga yoy
            const lx = p.bx + (p.ux - p.bx) * m
            const ly = p.by + (p.uy - p.by) * m
            const bend = Math.sin(Math.PI * m) * p.arc
            const dx = p.ux - p.bx
            const dy = p.uy - p.by
            const len = Math.hypot(dx, dy) || 1
            tx = ox + (lx - (dy / len) * bend) * box
            ty = oy + (ly + (dx / len) * bend) * box
          } else {
            tx = p.ux * w
            ty = p.uy * h
          }
          if (!reduced) {
            // «nafas»: kichik tebranish
            tx += Math.sin(time * 0.9 + p.phase) * 1.1
            ty += Math.cos(time * 0.7 + p.phase * 1.3) * 1.1
            // sichqoncha: yengil itarish + prujina bilan qaytish
            const dx = tx - px
            const dy = ty - py
            const d2 = dx * dx + dy * dy
            let fx = 0
            let fy = 0
            if (d2 < REPEL_RADIUS * REPEL_RADIUS) {
              const d = Math.sqrt(d2) || 1
              const f = (1 - d / REPEL_RADIUS) ** 2 * 16
              fx = (dx / d) * f
              fy = (dy / d) * f
            }
            p.offX += (fx - p.offX) * 0.12
            p.offY += (fy - p.offY) * 0.12
            p.glow = Math.max(0, p.glow - dt * 1.4)
          }
          const e = easeOut(prog)
          p.x = p.sx * w + (tx - p.sx * w) * e + p.offX
          p.y = p.sy * h + (ty - p.sy * h) * e + p.offY
        }

        // Nuqtalar: rang × shaffoflik guruhlari (har guruh bitta fill).
        // Transformatsiya yarmigacha katta miyadagi hajm qatlami rangida — so‘ng o‘z rangiga o‘tadi;
        // ortiqcha nuqtalar transformatsiya davomida kichrayib yo‘qoladi
        palette.colors.forEach((fill, c) => {
          if (!c) return
          ctx.fillStyle = fill
          ;[...ALPHAS, palette.ambientAlpha].forEach((alpha, k) => {
            ctx.beginPath()
            let any = false
            for (const p of particles) {
              if (p.glow > 0.05) continue
              const color = p.logo && p.morph < 0.5 ? p.bcolor : p.color
              if (color !== c) continue
              const r = p.extra ? p.size * (1 - p.morph) : p.size
              if (r < 0.2) continue
              const tw = reduced ? 0.6 : 0.6 + 0.4 * Math.sin(time * 1.3 + p.phase * 2)
              const level = p.logo ? (tw > 0.85 ? 2 : tw > 0.45 ? 1 : 0) : 3
              if (level !== k) continue
              dot(p.x, p.y, r)
              any = true
            }
            if (!any) return
            ctx.globalAlpha = alpha
            ctx.fill()
          })
        })
        ctx.globalAlpha = 1

        // Impuls o‘tgan neyronlar coral bo‘lib yorishadi
        ctx.beginPath()
        for (const p of particles) if (p.glow > 0.05 && !(p.extra && p.morph > 0.9)) dot(p.x, p.y, p.size * (1 + p.glow * 0.8))
        ctx.fillStyle = SPARK
        ctx.fill()

        // Neyronlar tasodifiy «yonadi»: katta miyada tez-tez, logoda kamroq
        if (!reduced && elapsed > ASSEMBLE_MS) {
          const rate = elapsed < MORPH_AT + MORPH_MS ? 14 : 3
          if (Math.random() < rate * dt) {
            const p = pick(particles)
            if (p?.logo) p.glow = 1
          }
        }

        // Impulslar: logodagi miyaning ko‘rinmas grafi bo‘ylab sakraydi (logo yig‘ilgach)
        if (!reduced && elapsed > MORPH_AT + MORPH_MS + 1000) {
          pulseClock += dt
          const from = pulseClock > 0.55 && pulses.length < MAX_PULSES ? pick(hubs) : undefined
          const to = from && pick(from.links)
          if (from && to) {
            pulseClock = 0
            pulses.push({
              from,
              to,
              t: 0,
              speed: rnd(2.2, 3.4),
              hops: Math.floor(rnd(5, 11)),
            })
          }
        }
        for (let k = pulses.length - 1; k >= 0; k--) {
          const pl = pulses[k]
          if (!pl) continue
          pl.t += pl.speed * dt
          if (pl.t >= 1) {
            pl.to.glow = 1
            const next = pick(pl.to.links.filter((q) => q !== pl.from))
            if (--pl.hops <= 0 || !next) {
              pulses.splice(k, 1)
              continue
            }
            pl.from = pl.to
            pl.to = next
            pl.t = 0
          }
          const x = pl.from.x + (pl.to.x - pl.from.x) * pl.t
          const y = pl.from.y + (pl.to.y - pl.from.y) * pl.t
          ctx.fillStyle = 'rgba(228,87,46,0.2)'
          ctx.beginPath()
          ctx.arc(x, y, 5, 0, Math.PI * 2)
          ctx.fill()
          ctx.fillStyle = SPARK
          ctx.beginPath()
          ctx.arc(x, y, 1.8, 0, Math.PI * 2)
          ctx.fill()
        }
      }

      // ───── Tsikl: faqat ko‘rinib turganda ─────
      let raf = 0
      let visible = false
      const loop = (now: number) => {
        frame(now)
        raf = visible && !document.hidden ? requestAnimationFrame(loop) : 0
      }
      function kick() {
        if (!reduced && !raf && visible && !document.hidden) {
          last = 0
          raf = requestAnimationFrame(loop)
        }
      }
      const io = new IntersectionObserver(([entry]) => {
        visible = Boolean(entry?.isIntersecting)
        kick()
      })
      const ro = new ResizeObserver(() => {
        resize()
        if (!raf) requestAnimationFrame(frame) // reduced-motion yoki to‘xtagan holatda ham to‘g‘ri o‘lchamda chizilsin
      })
      resize()
      io.observe(wrap)
      ro.observe(wrap)
      document.addEventListener('visibilitychange', kick)
      if (!reduced) {
        wrap.addEventListener('pointermove', onMove, { passive: true })
        wrap.addEventListener('pointerleave', onLeave)
        wrap.addEventListener('click', replay)
      }
      return () => {
        cancelAnimationFrame(raf)
        io.disconnect()
        ro.disconnect()
        document.removeEventListener('visibilitychange', kick)
        wrap.removeEventListener('pointermove', onMove)
        wrap.removeEventListener('pointerleave', onLeave)
        wrap.removeEventListener('click', replay)
      }
    }
  }, [tone])

  return (
    <div ref={wrapRef} aria-hidden className={className}>
      <canvas ref={canvasRef} className="absolute inset-0 size-full" />
    </div>
  )
}
