import { OrderedMap } from "../collections/OrderedMap";
import { HColor } from "../const/colors";
import {
  textElement,
  getSelector,
  getChildNodesIndex,
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
          textIndex: getChildNodesIndex(startNode),
        },
        endNodePath = {
          selectorPath: getSelector(endNode.parentElement),
          textIndex: getChildNodesIndex(endNode),
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
    return HighlightInfo.getHighlightingID(ele) !== null;
  }
  static getHighlightingID(ele: Element): string {
    if (ele == null) return null;
    if (ele.nodeName === MarkElement) {
      return ele.getAttribute(HighLightAttr);
    }
    const parentElem = HighlightInfo.getHighlightingElem(ele);
    if (parentElem !== null) {
      return parentElem.getAttribute(HighLightAttr);
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
        const id = ele.getAttribute(HighLightAttr);
        if (id != null) {
          return ele;
        }
      }
      ele = ele.parentElement;
    }
    return null;
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

  /**
   * clip the selected content and wrap them with the highlight marker
   * @param range the range can't span across multiple paragraphs. Or there will be too many edge cases to handle.
   * @returns the newly inserted element
   */
  createHighlightElem(range: Range): HTMLElement {
    const resultNode = document.createElement(MarkElement);
    // exclude the overlapped part from the previous marker
    const startParent = range.startContainer.parentElement;
    const spElem = HighlightInfo.getHighlightingElem(startParent);
    if (spElem !== null) {
      const prevId = HighlightInfo.getHighlightingID(spElem);
      const endParent = range.endContainer.parentElement;
      const epElem = HighlightInfo.getHighlightingElem(endParent);
      if (prevId === HighlightInfo.getHighlightingID(epElem)) {
        window.alert("can't make highlights inside an already existing one");
        return null;
      }
      const startNodeAfter = spElem.nextSibling;
      this.startNodePath = {
        selectorPath: getSelector(startNodeAfter.parentElement),
        textIndex: getChildNodesIndex(startNodeAfter),
      };
      range.setStart(startNodeAfter, 0);
    }
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
    resultNode.setAttribute(HighLightAttr, this.id);
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
export type HighlightOrderedMap = OrderedMap<string, HighlightInfo>;
export class HighlightArray {
  highlights: HighlightOrderedMap;

  // construct the Highlight array once a new tab was loaded
  constructor(hls: HighlightInfo[]) {
    this.highlights = new OrderedMap<string, HighlightInfo>((h) => h.id);
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
    callback: (hls: HighlightOrderedMap) => void = null
  ) {
    //TODO if select multiple paragraghs, we should returne a list of range.
    // use splitRangePerElement first and then loop the highlights array
    const hl = new HighlightInfo(hlconf);
    const range = hl.createRange();
    const newEle = hl.createHighlightElem(range);
    this._cleanHighlightsEmbeding(newEle);
    // this.highlights = makersNew; // order ??
    const allNextSiblings = this._findNextSiblings(newEle);
    this.highlights.append(hl);
    if (allNextSiblings.length > 0) {
      const firstSib = allNextSiblings[0];
      const idx = this.highlights.findIdx(firstSib.id);
      this.highlights.shiftUpward(this.highlights.size() - 1, idx);
      this._updateNextSiblings(allNextSiblings);
    }
    if (callback != null) {
      callback(this.highlights);
    }
  }

  deleteOneHighlight(
    ele: HTMLElement,
    callback: (h: HighlightOrderedMap) => void = null
  ) {
    const id = HighlightInfo.getHighlightingID(ele);
    this.highlights.removeByKey(id);
    unStyleIt(ele);
    const allNextSiblings = this._findNextSiblings(ele);
    // update the selector path of all the following siblings
    this._updateNextSiblings(allNextSiblings);

    if (callback != null) {
      callback(this.highlights);
    }
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
  private _findNextSiblings(targetEle: HTMLElement) {
    const allNextSiblings = new Array<HighlightInfo>();
    for (
      let nextSibOfsameParent = targetEle.nextSibling;
      nextSibOfsameParent != null;
      nextSibOfsameParent = nextSibOfsameParent.nextSibling
    ) {
      if (nextSibOfsameParent.nodeType == Node.ELEMENT_NODE) {
        const sibHl = this._loopFindSibHighlight(
          nextSibOfsameParent as HTMLElement
        );
        allNextSiblings.push(...sibHl);
      }
    }
    return allNextSiblings;
  }
  private _loopFindSibHighlight(n: HTMLElement): HighlightInfo[] {
    const ret = new Array<HighlightInfo>();
    if (HighlightInfo.isHighlightingElem(n)) {
      const h = this.highlights.find(HighlightInfo.getHighlightingID(n));
      // if n itself is a highlighted item, then we can happily return, cause the embedding highlights have been removed
      return [h];
    }
    for (let i = 0; i < n.childNodes.length; i++) {
      const c = n.childNodes[i];
      if (c.nodeType == Node.ELEMENT_NODE) {
        const e = c as HTMLElement;
        const h = this.highlights.find(HighlightInfo.getHighlightingID(e));
        if (h !== undefined) {
          ret.push(h);
        } else {
          const next = this._loopFindSibHighlight(e);
          if (next.length > 0) {
            ret.push(...next);
          }
        }
      }
    }
    return ret;
  }
  private _updateNextSiblings(allNextSiblings: HighlightInfo[]) {
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
        h.endNodePath.textIndex = startTextIndex + hlelem.childNodes.length - 2;
      });
    });
  }
  /**
   * clean the highlighting elements embedding inside the current element
   * @param elem the highlighting element
   */
  private _cleanHighlightsEmbeding(elem: HTMLElement) {
    // only consider the following contents, as we will make sure the selectio will not overwrite the previous marker
    const nextMarkerId = HighlightInfo.getHighlightingID(
      elem.nextElementSibling
    );
    // remove the highlight elements caused by splitting the ones in front or end
    const validNodes = new Array<Node>();
    const removeIds = new Set<string>();
    elem.childNodes.forEach((c, i) => {
      if (c.nodeName == MarkElement) {
        const e = c as HTMLElement;
        if (
          i == c.childNodes.length - 1 &&
          nextMarkerId != null &&
          nextMarkerId == HighlightInfo.getHighlightingID(e)
        ) {
          c.childNodes.forEach((n) => validNodes.push(n));
          return;
        } else if (HighlightInfo.isHighlightingElem(e)) {
          // remove middle markers
          c.childNodes.forEach((n) => validNodes.push(n));
          removeIds.add(HighlightInfo.getHighlightingID(e));
          return;
        }
      }
      validNodes.push(c);
    });
    elem.replaceChildren(...validNodes);
    removeIds.forEach((id) => this.highlights.removeByKey(id));
  }
}
