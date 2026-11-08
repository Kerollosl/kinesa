import React from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";
import "./modern.css";
import "./glass.css";
import "./app-experience.css";
import App from "./App.jsx";
import "./ui-audit-refinements.css";
import "./task-focused.css";
import "./components/play-feel.css";
import "./theme/tapestry.css";
createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
