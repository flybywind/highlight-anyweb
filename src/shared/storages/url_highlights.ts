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
// 2 problem:
/*
1. insertting the marker as native DOM element will pollute the selector path of other marker
    This will only happen when two markers are overlapped, we can merge the two if we found them overlapped.
2. assigning a static idx to the marker is not safe, if we delete one, the idx will lose its meaning
*/
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
