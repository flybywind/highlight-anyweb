import { HColor } from "../const/colors";
import {
  textElement,
  getSelector,
  getTextIndex,
  alignElement2SameLevel,
  styleIt,
  unStyleIt,
} from "./util";

interface TextNodePath {
  selectorPath: string;
  textIndex: number;
}
// 2 problem:
/*
1. insertting the marker as native DOM element will pollute the selector path of other marker
    XXX This will only happen when two markers are overlapped, we can merge the two if we found them overlapped.
        This will happen on all markers lying at the same parent node
2. assigning a static idx to the marker is not safe, if we delete one, the idx will lose its meaning
*/
interface HLconfigure {
  id?: string;
  startNodePath?: TextNodePath;
  startOffset?: number;
  endNodePath?: TextNodePath;
  endOffSet?: number;
  range?: Range | null;
  color?: HColor | string;
  category?: string | null;
  textContent?: string | null;
}

const HighLightAttr = "hlaw01";
export class HighlightInfo implements HLconfigure {
  id: string;
  startNodePath: TextNodePath;
  // because we only consider text node, so startOffset is the number of characters from the start of startNode
  startOffset: number;
  endNodePath: TextNodePath;
  endOffSet: number;
  range?: Range | null;
  color?: string;
  category?: string | null;
  textContent?: string;
  elementList?: HTMLElement[];

  constructor(config: HLconfigure) {
    if (config.range != null) {
      const hlNew = HighlightInfo.fromSelection(config.range);
      hlNew.color = config.color;
      hlNew.category = config.category;
      hlNew.textContent = config.range.toString();
      Object.assign(this, hlNew);
    } else {
      if (config.startNodePath == null || config.endNodePath == null) {
        throw new Error("invalid config: " + config);
      }
      Object.assign(this, config);
      if (this.id == null) {
        this.id = `hl_${Math.random().toString().slice(2)}`;
      }
    }
    this.elementList = new Array<HTMLElement>();
  }

  static fromSelection(range: Range): HighlightInfo {
    const startNode = range.startContainer;
    const endNode = range.endContainer;
    if (
      startNode.nodeType == Node.TEXT_NODE &&
      endNode.nodeType == Node.TEXT_NODE
    ) {
      const startNodePath = {
          selectorPath: getSelector(startNode.parentElement),
          textIndex: getTextIndex(startNode),
        },
        endNodePath = {
          selectorPath: getSelector(endNode.parentElement),
          textIndex: getTextIndex(endNode),
        };
      const startOffset = range.startOffset,
        endOffset = range.endOffset;
      const hlNew = new HighlightInfo({
        id: "hl_" + Math.random().toString().slice(2),
        startNodePath: startNodePath,
        startOffset: startOffset,
        endNodePath: endNodePath,
        endOffSet: endOffset,
        range: range,
      });
      return hlNew;
    } else {
      throw new Error(
        "only support to highlight text elements, but got range:" + range
      );
    }
  }
  static isHighlightingElem(ele: Element): boolean {
    return ele.getAttribute(HighLightAttr) === "1";
  }

  storeAsConfig(): HLconfigure {
    return {
      id: this.id,
      startNodePath: this.startNodePath,
      endNodePath: this.endNodePath,
      startOffset: this.startOffset,
      endOffSet: this.endOffSet,
      color: this.color,
      category: this.category,
      textContent: this.textContent,
    };
  }

  createRange(): Range {
    if (this.range != null) {
      return this.range;
    }
    const range = document.createRange();
    const startElem = document.querySelector(this.startNodePath.selectorPath);
    const endElem = document.querySelector(this.endNodePath.selectorPath);
    if (startElem !== null && endElem !== null) {
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
        this.range = range;
        return range;
      } else {
        throw new Error(
          `create range failed with offset out-of-range: ${this.startNodePath}, ${this.endNodePath}`
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

  createHighlightElem(range: Range): HTMLElement {
    const resultNode = document.createElement(MarkElement);
    //TODO: split range content into multiple element if it span across multiple paragraph
    resultNode.appendChild(range.extractContents());
    const newStyle = { cursor: "pointer", "background-color": this.color };
    styleIt(resultNode, newStyle);
    // resultNode.style.cursor = "pointer";
    // resultNode.style.backgroundColor = color;
    resultNode.onclick = (ev: MouseEvent) => {
      unStyleIt(resultNode);
    };
    range.insertNode(resultNode);
    // remove empty textNode caused by the insertion
    const parentElem = resultNode.parentElement;
    for (const s of [resultNode.previousSibling, resultNode.nextSibling]) {
      if (textElement(s) && s.textContent.length == 0) {
        parentElem.removeChild(s);
      }
    }
    resultNode.classList.add(this.id);
    resultNode.setAttribute(HighLightAttr, "1");
    this.elementList.push(resultNode);
    return resultNode;
  }

  // TODO:
  splitRangePerElement(): HighlightInfo[] {
    return null;
  }
}
// still prefer to use array to store the highlightinfo, as we need the correct insertion order to render them in the right place
//
// type HighlightID = string;

const MarkElement = "SPAN";
export class HighlightArray {
  highlights: HighlightInfo[];
  // htmlMap: Map<HighlightID, HTMLElement[]>;

  // construct the Highlight array once a new tab was loaded
  constructor(hls: HighlightInfo[]) {
    this.highlights = new Array<HighlightInfo>();
    if (hls != null) {
      hls.forEach((h) => this.insertOneHighlight(h, null));
    }
  }

  /**
   * insertOneHighlight insert the highlight in DOM and adjust the order of the highlight array to make sure that the hl appearring in front of pages also sits in front of the array
   * @param hlconf in this highlight conf, if the range is not null, create highlight info from range, meaning it is a newly added highlight; if range is null, use the other path info, meaning it's an old marker that need to be restored from storage
   * @param callback accept the newly created highlight info array
   */
  insertOneHighlight(
    hlconf: HLconfigure,
    callback: (hls: HighlightInfo[]) => void
  ) {
    //TODO if select multiple paragraghs, we should returne a list of range.
    // use splitRangePerElement first and then loop the highlights array
    const hl = new HighlightInfo(hlconf);
    const range = hl.createRange();
    const newEle = hl.createHighlightElem(range);
    this.cleanHighlightsEmbeding(newEle);
    // this.highlights = makersNew; // order ??
    const oldHls = this.highlights;
    let newHls = [hl];
    const allNextSiblings = new Array<HighlightInfo>();
    for (
      let nextSibOfsameParent = newEle.nextSibling;
      nextSibOfsameParent != null;
      nextSibOfsameParent = nextSibOfsameParent.nextSibling
    ) {
      if (nextSibOfsameParent.nodeType == Node.ELEMENT_NODE) {
        const sibHl = loopFindSibHighlight(
          nextSibOfsameParent as HTMLElement,
          oldHls
        );
        allNextSiblings.push(...sibHl);
      }
    }
    if (allNextSiblings.length > 0) {
      const firstSib = allNextSiblings[0];
      const idx = oldHls.findIndex((hl) => hl.id == firstSib.id);
      oldHls.splice(idx, 0, newHls[0]);
      newHls = [];
      // update the selector path of all the following siblings
      allNextSiblings.forEach((h) => {
        // query span.class_id element and merge the head or tail text node,
        // re-caculate the path info
        h.elementList.forEach((hlelem) => {
          let prevSib = hlelem.previousSibling;
          const startOffset = prevSib.textContent.length;
          let startTextIndex = 0;
          while (prevSib != null) {
            startTextIndex++;
            prevSib = prevSib.previousSibling;
          }
          h.startNodePath.textIndex = startTextIndex - 1;
          h.startOffset = startOffset;
          h.endNodePath.textIndex =
            startTextIndex + hlelem.childNodes.length - 2;
        });
      });
    }
    oldHls.push(...newHls);
    this.highlights = oldHls;
    if (callback != null) {
      callback(this.highlights);
    }
    // auxilary functions:
    function loopFindSibHighlight(
      n: HTMLElement,
      hls: HighlightInfo[]
    ): HighlightInfo[] {
      const ret = new Array<HighlightInfo>();
      if (HighlightInfo.isHighlightingElem(n)) {
        const h = hls.find((h) => n.classList.contains(h.id));
        // if n itself is a highlighted item, then we can happily return, cause the embedding highlights have been removed
        return [h];
      }
      for (let i = 0; i < n.childNodes.length; i++) {
        const c = n.childNodes[i];
        if (c.nodeType == Node.ELEMENT_NODE) {
          const e = c as HTMLElement;
          const h = hls.find((h) => e.classList.contains(h.id));
          if (h !== undefined) {
            ret.push(h);
          } else {
            const next = loopFindSibHighlight(e, hls);
            if (next.length > 0) {
              ret.push(...next);
            }
          }
        }
      }
      return ret;
    }
  }

  /**
   * clean the highlighting elements embedding inside the current element
   * @param elem the highlighting element
   */
  cleanHighlightsEmbeding(elem: HTMLElement) {
    const ids: string[] = [null, null];
    [elem.previousElementSibling, elem.nextElementSibling].forEach((s, i) => {
      if (s != null && HighlightInfo.isHighlightingElem(s)) {
        ids[i] = s.classList.toString();
      }
    });
    // remove the highlight elements caused by splitting the ones in front or end
    const validNodes = new Array<Node>();
    const removeIds = new Set<string>();
    elem.childNodes.forEach((c, i) => {
      if (c.nodeName == MarkElement) {
        const e = c as HTMLElement;
        if (
          (i == 0 && ids[0] == e.classList.toString()) ||
          (i == c.childNodes.length - 1 && ids[1] == e.classList.toString())
        ) {
          c.childNodes.forEach((n) => validNodes.push(n));
          return;
        } else if (HighlightInfo.isHighlightingElem(e)) {
          c.childNodes.forEach((n) => validNodes.push(n));
          removeIds.add(e.classList.toString());
          return;
        }
      }
      validNodes.push(c);
    });
    elem.replaceChildren(...validNodes);
    this.highlights = this.highlights.filter((h) => !removeIds.has(h.id));
  }

  // deleteOneHighlight(id: HighlightID) {}

  // renderOne(id: HighlightID) {}

  // renderAll() {}

  // updateStorage(url: string) {
  //   urlHighlightsStorage.get().then((hlMap) => {
  //     hlMap[url] = this.highlights;
  //     urlHighlightsStorage.set(hlMap);
  //   });
  // }
}
