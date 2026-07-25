import { Component } from "react";
import { AlertTriangle, RotateCcw } from "lucide-react";

export default class AppErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { failed: false };
  }

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error) {
    console.error("SincroMed render error", error);
  }

  render() {
    if (!this.state.failed) return this.props.children;

    return (
      <main className="sm-fatal-error">
        <AlertTriangle size={30} />
        <h1>No pudimos mostrar SincroMed</h1>
        <p>Recarga la página. Tus datos guardados no se perderán.</p>
        <button type="button" onClick={() => window.location.reload()}>
          <RotateCcw size={16} /> Recargar
        </button>
      </main>
    );
  }
}
