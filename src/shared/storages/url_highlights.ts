import {
  BaseStorage,
  createStorage,
  StorageType,
} from "@src/shared/storages/base";

import { HLconfigure } from "../html_util/url_highlights";
export type UrlHighlightMap = { [key: string]: HLconfigure[] };

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
