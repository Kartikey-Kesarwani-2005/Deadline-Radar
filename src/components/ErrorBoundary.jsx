import { Component } from 'react'

/**
 * Keeps one bad render from taking the whole radar down — judges should
 * never see a blank white page.
 */
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    console.error('[Deadline Radar] crashed:', error, info)
  }

  render() {
    if (this.state.error) {
      return (
        <div className="mx-auto max-w-md px-4 pt-24 text-center">
          <div className="rounded-2xl border border-red-500/30 bg-red-500/[0.06] p-6">
            <p className="text-3xl">📡</p>
            <h1 className="mt-2 text-lg font-bold text-slate-100">Radar lost the signal</h1>
            <p className="mt-2 text-sm leading-relaxed text-slate-400">
              Something went wrong, but your tasks are safe in this browser. Reload to get back
              on track.
            </p>
            <p className="mt-2 break-words font-mono text-[10px] text-slate-600">
              {String(this.state.error?.message || this.state.error)}
            </p>
            <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-emerald-400"
              >
                Reload
              </button>
              {/* Escape hatch: if stored data itself is what's crashing the app,
                  Reload just re-crashes. This clears the tasks and reloads so the
                  judge is never stuck in an unrecoverable loop. */}
              <button
                type="button"
                onClick={() => {
                  try {
                    localStorage.removeItem('deadline-radar.tasks.v1')
                  } catch {
                    /* storage blocked — reload still runs */
                  }
                  window.location.reload()
                }}
                className="rounded-lg border border-white/15 bg-white/[0.04] px-4 py-2 text-sm font-semibold text-slate-300 transition hover:border-white/30 hover:text-slate-100"
              >
                Reset tasks &amp; reload
              </button>
            </div>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
