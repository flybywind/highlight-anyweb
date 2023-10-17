import { createRoot } from "react-dom/client";
import App from "@src/pages/content/components/highlighter/app";
import UrlHighlightsStorage, {
  HighlightInfo,
} from "@src/shared/storages/url_highlights";
import refreshOnUpdate from "virtual:reload-on-update-in-view";
import colorLog from "@root/utils/log";

refreshOnUpdate("pages/content");

const root = document.createElement("div");
root.id = "chrome-extension-highlighter-content-view-root";

document.body.append(root);

const rootIntoShadow = document.createElement("div");
rootIntoShadow.id = "shadow-root";

const shadowRoot = root.attachShadow({ mode: "open" });
shadowRoot.appendChild(rootIntoShadow);

createRoot(rootIntoShadow).render(<App />);

function getCurrentTabUrl(): Promise<string> {
  return new Promise((resolve) => {
    chrome.tabs.query({ active: true, lastFocusedWindow: true }, (tabs) => {
      if (tabs.length > 0) {
        resolve(tabs[0].url);
      } else {
        resolve("");
      }
    });
  });
}
// const [urlHighlights, setUrlHighlights] = useStorage(UrlHighlightsStorage);
async function RenderStoredHighlights() {
  const currentUrl = await getCurrentTabUrl();
  async function getAllHighlights() {
    const urlHighlights = await UrlHighlightsStorage.get();
    const hls = urlHighlights.get(currentUrl);
    if (hls === undefined) {
      return Array<HighlightInfo>();
    }
    return hls;
  }
  const rangeList = await getAllHighlights();
  // todo
  console.log("url:", currentUrl, "range list: ", rangeList);
}

RenderStoredHighlights().then(() => {
  console.log("render all highlights");
});
