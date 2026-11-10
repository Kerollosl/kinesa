import { Component } from "react";

// Last line of defence: a render crash (or a corrupt save that triggers one)
// shows a way out instead of a blank purple screen.
export default class ErrorBoundary extends Component {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(error) {
    console.error("Kinesa crashed while rendering", error);
  }
  resetMatch = () => {
    // Progress and preferences are kept; only the in-flight match is dropped.
    try {
      localStorage.removeItem("kinesa-match");
      localStorage.removeItem("kinesa-match-meta");
    } catch {
      /* Blocked storage has nothing to clear. */
    }
    location.reload();
  };
  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <main className="error-screen" role="alert">
        <h1>Something went wrong.</h1>
        <p>
          Kinesa hit a problem and stopped. Your progress and badges are safe on
          this device. Reloading usually fixes it; if it keeps happening, start
          fresh without the unfinished match.
        </p>
        <div className="error-actions">
          <button className="primary-button" onClick={() => location.reload()}>
            Reload
          </button>
          <button className="secondary-button" onClick={this.resetMatch}>
            Clear unfinished match
          </button>
        </div>
      </main>
    );
  }
}
