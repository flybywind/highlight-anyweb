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
interface HLconfigure {
  id: string;
  startNodePath: TextNodePath;
  startOffset: number;
  endNodePath: TextNodePath;
  endOffSet: number;
  color: HColor | string;
  category?: string | null;
  textContent?: string | null;
}
export class HighlightInfo implements HLconfigure {
  id: string;
  startNodePath: TextNodePath;
  startOffset: number;
  endNodePath: TextNodePath;
  endOffSet: number;
  color: string;
  category?: string | null;
  textContent?: string;

  constructor(config: HLconfigure) {
    Object.assign(this, config);
  }

  createRange(): Range {
    const range = document.createRange();
    const startElem = document.querySelector(this.startNodePath.selectorPath);
    const endElem = document.querySelector(this.endNodePath.selectorPath);
    if (startElem !== undefined && endElem !== undefined) {
      const [startIdx, endIdx] = [
        this.startNodePath.textIndex,
        this.endNodePath.textIndex,
      ];
      if (
        startIdx < startElem.childNodes.length &&
        endIdx < endElem.childNodes.length
      ) {
        const startNode = startElem.childNodes[startIdx];
        const endNode = endElem.childNodes[endIdx];
        range.setStart(startNode, this.startOffset);
        range.setEnd(endNode, this.endOffSet);
        return range;
      } else {
        console.error(
          "create range failed with offset out-of-range:",
          this.startNodePath,
          this.endNodePath
        );
      }
    } else {
      console.error(
        "create range failed with empty selector:",
        this.startNodePath,
        this.endNodePath
      );
    }
    return null;
  }
}
const Key_UrlHighlights = "urlhighlight-storage-key";

export type UrlHighlightMap = { [key: string]: HighlightInfo[] };

type UrlHighlightsStorage = BaseStorage<UrlHighlightMap>;

const urlHighlightsStorage: UrlHighlightsStorage =
  createStorage<UrlHighlightMap>(
    Key_UrlHighlights,
    {},
    {
      storageType: StorageType.Local,
    }
  );
export default urlHighlightsStorage;
