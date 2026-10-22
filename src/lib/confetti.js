/**
 * Tiny dependency-free confetti burst from a screen point —
 * fired when a task is ticked done. Degrades silently.
 */

const COLORS = ['#34d399', '#fbbf24', '#38bdf8', '#f87171', '#a78bfa', '#e2e8f0']

export function burstConfetti(x, y) {
  try {
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return

    const W = 240
    const H = 240
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    const canvas = document.createElement('canvas')
    canvas.width = W * dpr
    canvas.height = H * dpr
    canvas.style.cssText = `position:fixed;left:${x - W / 2}px;top:${y - H / 2}px;width:${W}px;height:${H}px;pointer-events:none;z-index:9999`
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.scale(dpr, dpr)
    document.body.appendChild(canvas)

    const parts = Array.from({ length: 36 }, () => ({
      x: W / 2,
      y: H / 2,
      vx: (Math.random() - 0.5) * 7.5,
      vy: Math.random() * -6 - 1.5,
      size: 4 + Math.random() * 4,
      color: COLORS[(Math.random() * COLORS.length) | 0],
      rot: Math.random() * Math.PI,
      vr: (Math.random() - 0.5) * 0.3,
    }))

    const start = performance.now()
    let raf = 0
    function frame(t) {
      const elapsed = t - start
      ctx.clearRect(0, 0, W, H)
      const alpha = Math.max(0, 1 - elapsed / 950)
      for (const p of parts) {
        p.vy += 0.22
        p.x += p.vx
        p.y += p.vy
        p.vx *= 0.99
        p.rot += p.vr
        ctx.save()
        ctx.globalAlpha = alpha
        ctx.translate(p.x, p.y)
        ctx.rotate(p.rot)
        ctx.fillStyle = p.color
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6)
        ctx.restore()
      }
      if (elapsed < 950) {
        raf = requestAnimationFrame(frame)
      } else {
        cancelAnimationFrame(raf)
        canvas.remove()
      }
    }
    raf = requestAnimationFrame(frame)
  } catch {
    /* the celebration is a bonus — never break the tick for it */
  }
}
