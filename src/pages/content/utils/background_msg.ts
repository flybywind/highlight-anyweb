import { BackgroundReq, BackgroundResp } from "@pages/background/api_contract";

export function queryTabUrl(): Promise<string> {
  return new Promise<string>((resolve) =>
    chrome.runtime.sendMessage(
      { Command: "tabUrl" } as BackgroundReq,
      (resp: BackgroundResp) => {
        resolve(resp.url);
      }
    )
  );
}
