import React from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";
import App from "./App.tsx";
import ErrorBoundary from "./ErrorBoundary.tsx";
createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>,
);
