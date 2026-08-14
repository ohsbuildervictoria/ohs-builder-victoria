import { Component } from "react";

// A render-time throw with no boundary is a white screen — indistinguishable
// from "the site is down" for someone on a phone with no devtools. This is the
// last line of defence: friendly words and a reload button, never a blank page.
export default class ErrorBoundary extends Component {
  state = { error: null };

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error("[boundary]", error, info?.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
        <div className="w-full max-w-sm rounded-xl border border-amber-200 bg-amber-50 p-6 text-center">
          <p className="text-3xl">🔧</p>
          <h1 className="mt-2 text-lg font-bold text-slate-800">
            Something went wrong on this screen
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Your work is saved on the server — nothing is lost. Reload to pick
            up where you left off.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 w-full rounded-lg bg-blue-900 py-2.5 text-sm font-semibold text-white"
          >
            Reload
          </button>
        </div>
      </div>
    );
  }
}
