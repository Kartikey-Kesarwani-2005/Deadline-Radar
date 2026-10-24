import { Component } from 'react'
import Icon from './Icon'

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
          <div className="paper-card border-late/40 p-6">
            <span className="stamp">Signal lost</span>
            <p className="mt-4 flex justify-center text-late">
              <Icon name="wifiOff" size={28} strokeWidth={1.3} />
            </p>
            <h1 className="mt-2 font-serif text-xl font-semibold text-ink">Radar lost the signal</h1>
            <p className="mt-2 text-sm leading-relaxed text-ink-2">
              Something went wrong, but your tasks are safe in this browser. Reload to get back on
              track.
            </p>
            <p className="mt-2 rounded-[3px] border border-line bg-paper px-2 py-1 font-mono text-[10px] break-words text-ink-3">
              {String(this.state.error?.message || this.state.error)}
            </p>
            <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
              <button type="button" onClick={() => window.location.reload()} className="btn btn-primary">
                <Icon name="repeat" size={12} />
                Reload radar
              </button>
              {/* Escape hatch: if stored data itself is what's crashing the app,
                  Reload just re-crashes. Clearing tasks breaks the loop. */}
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
                className="btn btn-quiet"
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
