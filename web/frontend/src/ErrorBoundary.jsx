import { Component } from 'react';

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null, info: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error('ErrorBoundary caught an error:', error, info);
    this.setState({ info });
  }

  render() {
    if (this.state.error) {
      return (
        <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-6">
          <div className="w-full max-w-2xl rounded-[32px] border border-rose-500/30 bg-slate-900/95 p-8 shadow-2xl shadow-slate-950/40">
            <h1 className="text-3xl font-bold text-rose-300">Terjadi Kesalahan</h1>
            <p className="mt-4 text-slate-300">Aplikasi mengalami error saat memuat dashboard. Silakan refresh atau hubungi tim teknis.</p>
            <div className="mt-6 rounded-3xl bg-slate-950/80 p-4 text-xs text-slate-400">
              <p className="font-semibold text-slate-100">Detail Error:</p>
              <pre className="mt-2 max-h-72 overflow-y-auto whitespace-pre-wrap break-words">{String(this.state.error)}</pre>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
