import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import { readStoredTheme } from "./lib/theme";
import "./styles/index.css";
import "./styles/print.css";

document.documentElement.dataset.appTheme = readStoredTheme();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
