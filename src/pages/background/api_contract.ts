export interface BackgroundReq {
  Command: "tabUrl" | "others";
}
export interface BackgroundResp {
  [key: string]: any;
}
