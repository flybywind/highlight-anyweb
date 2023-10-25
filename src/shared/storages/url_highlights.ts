import {
  BaseStorage,
  createStorage,
  StorageType,
} from "@src/shared/storages/base";

import { HighlightInfo } from "../html_util/url_highlights";
export type UrlHighlightMap = { [key: string]: HighlightInfo[] };

type UrlHighlightsStorage = BaseStorage<UrlHighlightMap>;

const Key_UrlHighlights = "urlhighlight-storage-key";
const urlHighlightsStorage: UrlHighlightsStorage =
  createStorage<UrlHighlightMap>(
    Key_UrlHighlights,
    {},
    {
      storageType: StorageType.Local,
    }
  );
export default urlHighlightsStorage;
