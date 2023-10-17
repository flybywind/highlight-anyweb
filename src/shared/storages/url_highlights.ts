import {
  BaseStorage,
  createStorage,
  StorageType,
} from "@src/shared/storages/base";
import { HColor } from "../const/colors";

interface TextNodePath {
  selectorPath: string;
  textIndex: number;
}
export interface HighlightInfo {
  startNodePath: TextNodePath;
  startOffset: number;
  endNodePath: TextNodePath;
  endOffSet: number;
  color: HColor | string;
}
const Key_UrlHighlights = "urlhighlight-storage-key";

type urlMap = { [key: string]: HighlightInfo[] };

type UrlHighlightsStorage = BaseStorage<urlMap>;

const urlHighlightsStorage: UrlHighlightsStorage = createStorage<urlMap>(
  Key_UrlHighlights,
  {},
  {
    storageType: StorageType.Local,
  }
);
export default urlHighlightsStorage;
