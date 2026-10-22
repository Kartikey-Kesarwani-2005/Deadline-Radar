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
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="mt-4 rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-emerald-400"
            >
              Reload
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
