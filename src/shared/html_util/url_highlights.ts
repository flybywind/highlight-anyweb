import assert from "assert";
import { OrderedMap } from "../collections/OrderedMap";
import { HColor } from "../const/colors";
import {
  textElement,
  getSelector,
  styleIt,
  unStyleIt,
  forEachTextNode,
} from "./util";

/**
 * Main idea, store the rendered innerHTML for the highlights
 */

interface HLconfigure {
  id?: string;
  range?: Range | null;
  color?: HColor | string;
  category?: string | null;
  textContent?: string | null;
  parentSelector?: string; // should contain eighter range or parentSelector
  textStartAt?: number;
  textEndAt?: number;
}

export const HighLightIDAttr = "hlaw";
export const HighLightSeqAttr = "hlseq";
export const HighLightOriginColorAttr = "hlsoc";
// one seq can map to multiple highlighting id, one id represent a small highl html segment
export class HighlightInfo {
  id: string;
  parentSelector: string;
  range?: Range; // will only be initialized during construction
  color?: string;
  category?: string | null;
  textContent?: string;
  textStartAt?: number;
  textEndAt?: number;

  constructor(config: HLconfigure) {
    // assert(config.seq > 0, "hl seq must > 0");
    Object.assign(this, config);
    if (this.id == null) {
      this.id = `hl_${Math.random().toString().slice(2)}`;
    }

    if (this.range != null) {
      let parentElem: HTMLElement = this.range.commonAncestorContainer;
      if (parentElem.nodeType == Node.TEXT_NODE) {
        parentElem = parentElem.parentElement;
      }
      this.parentSelector = getSelector(parentElem);
      this.textContent = this.range.toString();
      this.textStartAt = 0;
      this.textEndAt = 0;
      let meetStart = false,
        meetEnd = false;
      const [startNode, endNode] = [
        this.range.startContainer,
        this.range.endContainer,
      ];
      if (
        startNode.nodeType !== Node.TEXT_NODE ||
        endNode.nodeType !== Node.TEXT_NODE
      ) {
        throw new Error("can't highlight node of non-text type!");
      }
      forEachTextNode(parentElem, (c) => {
        if (!meetStart) {
          if (c !== startNode) {
            this.textStartAt += c.textContent.length;
          } else {
            if (c === endNode) {
              meetEnd = true;
              this.textEndAt = this.textStartAt + this.range.endOffset;
            } else {
              this.textEndAt = this.textStartAt + c.textContent.length;
            }
            this.textStartAt += this.range.startOffset;
            meetStart = true;
          }
        } else {
          if (!meetEnd) {
            if (c !== endNode) {
              this.textEndAt += c.textContent.length;
            } else {
              this.textEndAt += this.range.endOffset;
              meetEnd = true;
            }
          }
        }
      });
    }
    if (
      this.parentSelector == null ||
      this.textContent.length == 0 ||
      this.textEndAt - this.textStartAt != this.textContent.length
    ) {
      throw new Error("invalid highlight config: " + JSON.stringify(this));
    }
  }

  storeAsConfig(): HLconfigure {
    return {
      id: this.id,
      parentSelector: this.parentSelector,
      color: this.color,
      category: this.category,
      textContent: this.textContent,
      textStartAt: this.textStartAt,
      textEndAt: this.textEndAt,
    };
  }
  //TODO: split range content into multiple element if it span across multiple paragraph
  /**
   * clip the selected content and wrap them with the highlight marker
   * @returns the newly inserted element
   */
  createHighlightElem(): HTMLElement {
    let range: Range;
    const rootElem = document.querySelector(this.parentSelector);
    if (rootElem === null) {
      throw new Error("no such element found: " + this.parentSelector);
    }
    if (this.range != null) {
      // use the initialized range from construction, meaning it was created from user selection; Or it means it is gonna to be initialized from storage
      range = this.range;
    } else {
      // construct range from start/end postion of the parent element
      range = document.createRange();
      let ti = 0;
      let initStart = false,
        initEnd = false;
      forEachTextNode(rootElem, (n) => {
        ti += n.textContent.length;
        if (!initStart) {
          if (ti >= this.textStartAt) {
            initStart = true;
            range.setStart(n, n.textContent.length - (ti - this.textStartAt));
          }
        } else {
          if (!initEnd) {
            if (ti >= this.textEndAt) {
              range.setEnd(n, n.textContent.length - (ti - this.textEndAt));
              initEnd = true;
            }
          }
        }
      });
    }

    const resultNode = document.createElement(MarkElement);
    resultNode.appendChild(range.extractContents());
    const newStyle = { cursor: "pointer", "background-color": this.color };
    styleIt(resultNode, newStyle);
    resultNode.onclick = (ev: MouseEvent) => {
      unStyleIt(resultNode);
    };
    range.insertNode(resultNode);
    // remove empty textNode caused by the insertion
    for (const s of [resultNode.previousSibling, resultNode.nextSibling]) {
      if (textElement(s) && s.textContent.length == 0) {
        rootElem.removeChild(s);
      }
    }
    for (const s of [resultNode.firstChild, resultNode.lastChild]) {
      if (textElement(s) && s.textContent.length == 0) {
        resultNode.removeChild(s);
      }
    }
    resultNode.setAttribute(HighLightIDAttr, this.id);
    return resultNode;
  }
}

export class Tool {
  static isHighlightingElem(ele: Element): boolean {
    return Tool.getHighlightingID(ele) !== null;
  }
  static getHighlightingID(ele: Element): string {
    if (ele == null) return null;
    if (ele.nodeName === MarkElement) {
      return ele.getAttribute(HighLightIDAttr);
    }
    return null;
  }

  static getHighlightingElem(ele: Element): Element {
    if (ele == null) return null;
    while (
      ele.nodeName !== "DIV" &&
      ele.nodeName !== "MAIN" &&
      ele.nodeName !== "BODY"
    ) {
      if (ele.nodeName === MarkElement) {
        const id = ele.getAttribute(HighLightIDAttr);
        if (id != null) {
          return ele;
        }
      }
      ele = ele.parentElement;
    }
    return null;
  }
  static setBackgroundColor(ele: HTMLElement) {
    const oc = ele.getAttribute(HighLightOriginColorAttr);
    if (oc === null) {
      // the first time to change the background color
      const oc = ele.style.backgroundColor;
      ele.setAttribute(HighLightOriginColorAttr, oc);
    }
    const parentElem = ele.parentElement;
    let color = oc;
    if (Tool.isHighlightingElem(parentElem)) {
      color = parentElem.style.backgroundColor;
    }
    if (color === oc && oc !== null) {
      ele.removeAttribute(HighLightOriginColorAttr);
    }
    if (color != null) {
      ele.style["background-color"] = color;
    }
  }
}
// still prefer to use array to store the highlightinfo, as we need the correct insertion order to render them in the right place
//
// type HighlightID = string;

const MarkElement = "SPAN";
export type HighlightOrderedMap = OrderedMap<string, HighlightInfo>;
/**
 * maintain the highlight operation sequence and the resulted innerHTML mapping to each operation
 */
export class HighlightSeq {
  highlights: HighlightOrderedMap;
  // construct the Highlight array once a new tab was loaded
  constructor(hls: HighlightInfo[]) {
    this.highlights = new OrderedMap<string, HighlightInfo>((h) => h.id);
    if (hls != null) {
      hls.forEach((h) => {
        this.insertOneHighlight(h, null);
      });
    }
  }

  /**
   * insertOneHighlight insert the highlight in DOM and adjust the order of the highlight array to make sure that the hl appearring in front of pages also sits in front of the array
   * @param hlconf in this highlight conf, if the range is not null, create highlight info from range, meaning it is a newly added highlight; if range is null, use the other path info, meaning it's an old marker that need to be restored from storage
   * @param callback accept the newly created highlight info array
   */
  insertOneHighlight(
    hlconf: HLconfigure,
    callback: (hls: HighlightOrderedMap) => void = null
  ) {
    const hl = new HighlightInfo(hlconf);
    this.highlights.append(hl);
    const newEle = hl.createHighlightElem();
    this._updateBackgroundColorOfEmbeded(newEle.childNodes);
    if (callback != null) {
      callback(this.highlights);
    }
  }

  deleteOneHighlight(
    hl: { ele?: HTMLElement; id?: string },
    callback: (h: HighlightOrderedMap) => void = null
  ) {
    let { ele, id } = hl;
    if (id === undefined && ele !== undefined) {
      id = Tool.getHighlightingID(ele);
    } else if (id !== undefined && ele === undefined) {
      ele = this.queryHighlightElem(id);
    } else {
      throw new Error("need to specify which element or id to be delete");
    }
    this.highlights.removeByKey(id);
    const newChildNodes = unStyleIt(ele);
    this._updateBackgroundColorOfEmbeded(newChildNodes);
    if (callback != null) {
      callback(this.highlights);
    }
  }

  private queryHighlightElem(id: string): HTMLElement {
    const hl = this.highlights.find(id);
    const parentElem = document.querySelector(hl.parentSelector);
    for (let i = 0; i < parentElem.childElementCount; i++) {
      const e = parentElem.children[i] as HTMLElement;
      if (Tool.getHighlightingID(e) === id) {
        return e;
      }
    }
    return null;
  }
  // renderOne(id: HighlightID) {}

  // renderAll() {}

  // updateStorage(url: string) {
  //   urlHighlightsStorage.get().then((hlMap) => {
  //     hlMap[url] = this.highlights;
  //     urlHighlightsStorage.set(hlMap);
  //   });
  // }

  // auxilary functions:
  /**
   * update the background color of the highlighting elements embedding inside the current element
   * @param elem the highlighting element
   */
  private _updateBackgroundColorOfEmbeded(childNodes) {
    childNodes.forEach((c) => {
      if (c.nodeType == Node.ELEMENT_NODE) {
        const e = c as HTMLElement;
        if (Tool.isHighlightingElem(e)) {
          Tool.setBackgroundColor(e);
        }
      }
    });
  }
}
