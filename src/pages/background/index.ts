import reloadOnUpdate from "virtual:reload-on-update-in-background-script";
import { BackgroundReq, BackgroundResp } from "./api_contract";

chrome.runtime.onMessage.addListener(async function (
  request: BackgroundReq,
  sender: chrome.runtime.MessageSender,
  sendResponse: (resp: BackgroundResp) => void
) {
  if (request.Command === "tabUrl") {
    sendResponse({ url: sender.tab?.url });
  }
});
reloadOnUpdate("pages/background");

/**
 * Extension reloading is necessary because the browser automatically caches the css.
 * If you do not use the css of the content script, please delete it.
 */
reloadOnUpdate("pages/content/style.scss");
