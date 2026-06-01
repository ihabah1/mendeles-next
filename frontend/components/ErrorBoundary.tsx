"use client";
import { Component, ReactNode } from "react";

interface Props { children: ReactNode; fallback?: ReactNode; }
interface State { hasError: boolean; error?: Error; }

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div style={{ padding: 40, textAlign: "center" }}>
          <div style={{ fontSize: "2rem", marginBottom: 12 }}>⚠️</div>
          <div style={{ color: "var(--muted)", fontSize: ".84rem", marginBottom: 16 }}>משהו השתבש. נסה לרענן את הדף.</div>
          <button className="btn btn-gold" onClick={() => window.location.reload()}>רענן</button>
        </div>
      );
    }
    return this.props.children;
  }
}
