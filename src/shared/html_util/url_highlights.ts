import tinycolor from "tinycolor2";
import { OrderedMap } from "../collections/OrderedMap";
import { HColor } from "../const/colors";
import {
  textElement,
  getSelector,
  styleIt,
  unStyleIt,
  forEachTextNode,
  firstNoninlineParent,
  loopTextNodeInRange,
  StopForEach,
} from "./util";

/**
 * Main idea, store the rendered innerHTML for the highlights
 */

export interface HLconfigure {
  id?: string;
  // range?: Range | null;
  color?: HColor | string;
  category?: string | null;
  textContent?: string | null;
  parentSelector?: string; // should contain eighter range or parentSelector
  textStartAt?: number;
  textEndAt?: number;
}

export const HighLightIDAttr = "hlaw";
export const HighLightCurrColorAttr = "hlcco";
export const HighLightOriginColorAttr = "hloco";
// one seq can map to multiple highlighting id, one id represent a small highl html segment
export class HighlightInfo {
  id: string;
  parentSelector: string;
  // range?: Range; // will only be initialized during construction
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
    const rootElem = document.querySelector(this.parentSelector);
    if (rootElem === null) {
      throw new Error("no such element found: " + this.parentSelector);
    }

    // construct range from start/end postion of the parent element
    const range = document.createRange();
    let ti = 0;
    let initStart = false;
    forEachTextNode(rootElem, (n) => {
      ti += n.textContent.length;
      if (!initStart) {
        if (ti >= this.textStartAt) {
          initStart = true;
          range.setStart(n, n.textContent.length - (ti - this.textStartAt));
        }
      }
      if (ti >= this.textEndAt) {
        range.setEnd(n, n.textContent.length - (ti - this.textEndAt));
        throw new StopForEach();
      }
    });

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
  static setBackgroundColor(ele: HTMLElement, color: string = null) {
    const oc = ele.getAttribute(HighLightOriginColorAttr);
    if (oc === null) {
      // the first time to change the background color
      const oc = ele.style.backgroundColor;
      ele.setAttribute(HighLightOriginColorAttr, oc);
    }
    let parentElem = ele.parentElement;
    if (color == null) {
      color = oc;
      while (Tool.isHighlightingElem(parentElem)) {
        color = parentElem.style.backgroundColor;
        parentElem = parentElem.parentElement;
      }
    }
    if (color === oc && oc !== null) {
      ele.removeAttribute(HighLightOriginColorAttr);
    }
    if (color != null) {
      ele.style["background-color"] = color;
    }
  }

  static createHLConfWRange(
    range: Range,
    template: HLconfigure
  ): HLconfigure[] {
    // assert(
    //   template.textStartAt === undefined,
    //   "template can only specify color / category "
    // );
    const ret: HLconfigure[] = [];
    let parentElem: HTMLElement = null;
    let curConf: HLconfigure = {};
    let lastNode: Node = null;
    let textContent: string[] = [];
    let localStartOffset = -1, // offset in the local text node
      localEndOffset = -1;
    let startOffset = 0; // offset in the whole paragragh
    // find the startOffset in the first block
    forEachTextNode(
      firstNoninlineParent(range.startContainer.parentElement),
      (n) => {
        if (range.startContainer === n) {
          throw new StopForEach();
        }
        startOffset += n.textContent.length;
      }
    );

    loopTextNodeInRange(range, (n) => {
      const p2 = firstNoninlineParent(n.parentElement);
      localStartOffset = n === range.startContainer ? range.startOffset : 0;
      localEndOffset =
        n === range.endContainer ? range.endOffset : n.textContent.length;
      if (parentElem === null || parentElem !== p2) {
        // find a new block
        if (curConf.textStartAt !== undefined && lastNode !== null) {
          curConf.textContent = textContent.join("");
          if (curConf.textContent.replace(/\s/g, "").length > 0) {
            curConf.textEndAt =
              curConf.textStartAt + curConf.textContent.length;
            curConf.parentSelector = getSelector(parentElem);
            ret.push(curConf);
          }
        }
        curConf = Object.assign({}, template);
        textContent = [];
        curConf.textStartAt = startOffset + localStartOffset;
        parentElem = p2;
        startOffset = 0;
      }
      lastNode = n;
      textContent.push(n.textContent.slice(localStartOffset, localEndOffset));
    });
    // process the last part
    curConf.textContent = textContent.join("");
    if (curConf.textContent.replace(/\s/g, "").length > 0) {
      curConf.textEndAt = curConf.textStartAt + curConf.textContent.length;
      curConf.parentSelector = getSelector(parentElem);
      ret.push(curConf);
    }
    return ret;
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
  private hl_htmlele: Map<string, HTMLElement[]>;
  private clickHandler: (e: HTMLElement) => void;
  highlights: HighlightOrderedMap;
  // construct the Highlight array once a new tab was loaded
  constructor(hls: HLconfigure[]) {
    this.highlights = new OrderedMap<string, HighlightInfo>((h) => h.id);
    this.hl_htmlele = new Map();
    if (hls != null) {
      hls.forEach((h) => {
        this.insertOneHighlight(h, null);
      });
    }
  }

  /**
   * insertOneHighlight insert the highlight in DOM from hlconfig
   * @param hlconf
   * @param callback accept the newly created highlight info array
   */
  insertOneHighlight(
    hlconf: HLconfigure,
    callback: (hls: HighlightOrderedMap) => void = null
  ) {
    const hl = new HighlightInfo(hlconf);
    this.highlights.append(hl);
    const newEle = hl.createHighlightElem();

    this.hl_htmlele.set(hl.id, [newEle]);
    this._updateSiblingHle(newEle.childNodes, hlconf.color);
    this._addEvent(hl.id, newEle);
    if (callback != null) {
      callback(this.highlights);
    }
  }

  insertOneHighlightRange(
    range: Range,
    color: string,
    category: string,
    callback: (hls: HighlightOrderedMap) => void = null
  ) {
    const hlconfs = Tool.createHLConfWRange(range, {
      color: color,
      category: category,
    });

    hlconfs.forEach((hl) => {
      this.insertOneHighlight(hl, callback);
    });
  }

  deleteOneHighlight(
    hl: { ele?: HTMLElement; id?: string },
    callback: (h: HighlightOrderedMap) => void = null
  ) {
    let { ele, id } = hl;
    if (id === undefined && ele !== undefined) {
      id = Tool.getHighlightingID(ele);
    }
    this.highlights.removeByKey(id);
    this.hl_htmlele.get(id).forEach((ele) => {
      const newChildNodes = unStyleIt(ele);
      this._updateSiblingHle(newChildNodes);
    });
    this.hl_htmlele.delete(id);
    if (callback != null) {
      callback(this.highlights);
    }
  }

  setClickHLHander(h) {
    this.clickHandler = h;
  }

  queryHighlightElem(id: string): HTMLElement[] {
    return this.hl_htmlele.get(id);
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
   * update sibling highlight elements, like the background color of the highlighting elements embedding inside the current element and the segments array
   * @param elem the highlighting element
   */
  private _updateSiblingHle(
    childNodes: { forEach: (any) => void },
    color: string = null
  ) {
    childNodes.forEach((c) => {
      if (c.nodeType == Node.ELEMENT_NODE) {
        const e = c as HTMLElement;
        if (Tool.isHighlightingElem(e)) {
          Tool.setBackgroundColor(e, color);
          const hlID = Tool.getHighlightingID(e);
          const htmlArr = this.hl_htmlele.get(hlID);
          const idxs = [];
          htmlArr.forEach((h, i) => {
            if (h === e) {
              idxs.push(i);
            }
          });
          if (idxs.length == 0) {
            htmlArr.push(e);
            this._addEvent(hlID, e);
          } else if (idxs.length >= 2) {
            idxs.slice(1).forEach((i) => htmlArr.splice(i, 1));
          }
        }
        this._updateSiblingHle(e.childNodes, color);
      }
    });
  }

  private _addEvent(id: string, ele: HTMLElement) {
    ele.onclick = (ev) => {
      ev.preventDefault();
      ev.stopPropagation();
      this.clickHandler(ele);
    };
    ele.onmouseenter = (ev) => {
      ev.preventDefault();
      ev.stopPropagation();
      const allele = this.queryHighlightElem(id);
      const hlconf = this.highlights.find(id);
      allele.forEach((e) => {
        e.setAttribute(HighLightCurrColorAttr, e.style.backgroundColor);
        e.style.backgroundColor = tinycolor(hlconf.color)
          .darken(10)
          .toHexString();
      });
    };
    ele.onmouseleave = (ev) => {
      ev.preventDefault();
      ev.stopPropagation();
      const allele = this.queryHighlightElem(id);
      allele.forEach((e) => {
        const currColor = e.getAttribute(HighLightCurrColorAttr);
        e.setAttribute(HighLightCurrColorAttr, null);
        e.style.backgroundColor = currColor;
      });
    };
  }
}
