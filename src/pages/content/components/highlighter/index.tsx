import styles from "@pages/content/style.scss";
import fastyles from "@assets/fonts/fontawesome-free-6.4.2-web/css/all.min.css";
import React from "react";
import { createRoot } from "react-dom/client";
import App from "@src/pages/content/components/highlighter/app";

import refreshOnUpdate from "virtual:reload-on-update-in-view";

import { RenderStoredHighlights } from "./render";

refreshOnUpdate("pages/content");

const root = document.createElement("div");
root.id = "chrome-extension-highlighter-content-view-root";

document.body.append(root);

const rootIntoShadow = document.createElement("div");
rootIntoShadow.id = "shadow-root";

const shadowRoot = root.attachShadow({ mode: "open" });
shadowRoot.appendChild(rootIntoShadow);

createRoot(rootIntoShadow).render(
  <React.StrictMode>
    <style type="text/css">{styles}</style>
    <style type="text/css">{fastyles}</style>
    <App />
  </React.StrictMode>
);

RenderStoredHighlights().then(() => {
  console.log("render all highlights");
});
