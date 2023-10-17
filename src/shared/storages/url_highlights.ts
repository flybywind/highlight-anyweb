import {
  BaseStorage,
  createStorage,
  StorageType,
} from "@src/shared/storages/base";
import { HColor } from "../const/colors";

export interface HighlightInfo {
  startSelectorPath: string;
  startOffset: number;
  endSelectorPath: string;
  endOffSet: number;
  color: HColor | string;
}
const Key_UrlHighlights = "urlhighlight-storage-key";

type urlMap = Map<string, HighlightInfo[]>;

type UrlHighlightsStorage = BaseStorage<urlMap>;

const urlHighlightsStorage: UrlHighlightsStorage = createStorage<urlMap>(
  Key_UrlHighlights,
  new Map<string, HighlightInfo[]>(),
  {
    storageType: StorageType.Local,
  }
);
export default urlHighlightsStorage;
