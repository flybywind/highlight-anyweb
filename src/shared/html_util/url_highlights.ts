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
  // because we only consider text node, so startOffset is the number of characters from the start of startNode
  startOffset: number;
  endNodePath: TextNodePath;
  endOffSet: number;
  color: string;
  category?: string | null;
  textContent?: string;
  elementList?: HTMLElement[];

  constructor(config: HLconfigure) {
    Object.assign(this, config);
    this.elementList = new Array<HTMLElement>();
  }

  createRange(): Range {
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

  createHighlightElem(range: Range): Element {
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
    resultNode.classList.add(this.id);
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
    // this.htmlMap = new Map();
    // //NOTE: assume the highlights order are already sorted
    // this.highlights.forEach((hl) => {
    //   const id = hl.id;
    //   const htmlAry = new Array<HTMLElement>();
    //   const ele0 = document.querySelector(
    //     hl.startNodePath.selectorPath
    //   ) as HTMLElement;
    //   const ele1 = document.querySelector(
    //     hl.endNodePath.selectorPath
    //   ) as HTMLElement;
    //   const ancestor = hl.createRange().commonAncestorContainer;
    //   if (ele0 != null && ele1 != null) {
    //     if (ancestor.nodeType !== Node.ELEMENT_NODE) {
    //       if (ele1 === ele0) {
    //         htmlAry.push(ele0);
    //       } else {
    //         throw new Error(
    //           `should not go here: ${ele0}, ${ele1}, ${ancestor}`
    //         );
    //       }
    //     } else {
    //       const [startElem, lastElem] = alignElement2SameLevel(
    //         ele0,
    //         ele1,
    //         ancestor as HTMLElement
    //       );
    //       const endElem = lastElem.nextElementSibling;
    //       for (
    //         let ele = startElem;
    //         ele != endElem;
    //         ele = ele.nextElementSibling as HTMLElement
    //       ) {
    //         // if contains only #text node
    //         if (textElement(ele)) {
    //           htmlAry.push(ele);
    //         } else {
    //           throw new Error(`skip element that are not text segment: ${ele}`);
    //         }
    //       }
    //       this.htmlMap.set(id, htmlAry);
    //     }
    //   } else {
    //     throw new Error(
    //       `start or end element not found for highlight maker:, ${hl}`
    //     );
    //   }
    // });
  }

  /**
   * insertOneHighlight
   * @param hl highlight marker waiting to be inserted, if the id is null, create a new one, or means it's an old marker that need to be restored from storage
   * @param callback accept the newly created highlight info array
   */
  insertOneHighlight(
    hl: HighlightInfo,
    callback: (hls: HighlightInfo[]) => void
  ) {
    //TODO if select multiple paragraghs, we should returne a list of range.
    // use splitRangePerElement first and then loop the highlights array
    const range = hl.createRange();
    const { hlNew, rangeNew, makersNew } = createNewHighlightWoOverlap(
      range,
      this.highlights,
      hl.id
    );
    if (hlNew !== null) {
      const newEle = hlNew.createHighlightElem(rangeNew);
      // this.highlights = makersNew; // order ??
      const oldHls = makersNew.splice(0, makersNew.length - 1);
      let newHls = makersNew;
      const allNextSiblings = new Array<HighlightInfo>();
      for (
        let nextSibOfsameParent = newEle.nextSibling;
        nextSibOfsameParent != null;
        nextSibOfsameParent = nextSibOfsameParent.nextSibling
      ) {
        const sibHl = loopFindSibHighlight(nextSibOfsameParent, oldHls);
        allNextSiblings.push(...sibHl);
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
          // const htmlElem = this.htmlMap.get(h.id);
          // const [startElem, endElem] = [
          //   htmlElem[0],
          //   htmlElem[htmlElem.length - 1],
          // ];
          // h.startNodePath.selectorPath = getSelector(startElem);
          // h.startNodePath.textIndex = getTextIndex(startElem);
          // h.endNodePath.selectorPath = getSelector(endElem);
          // h.endNodePath.textIndex = getTextIndex(endElem);
          h.elementList.forEach((hlelem) => {
            let prevSib = hlelem.previousSibling;
            const startOffset = prevSib.textContent.length;
            let startTextIndex = 0;
            while (prevSib != null) {
              startTextIndex++;
              prevSib = prevSib.previousSibling;
            }
            h.startNodePath.textIndex = startTextIndex;
            h.startOffset = startOffset;
            h.endNodePath.textIndex =
              startTextIndex + hlelem.childNodes.length - 1;
          });
        });
      }
      oldHls.push(...newHls);
      this.highlights = oldHls;
      if (callback != null) {
        callback(oldHls);
      }
    } else {
      throw new Error(`create hights failed: ${range}, ${this.highlights}`);
    }
    // auxilary functions:
    function loopFindSibHighlight(
      n: Node,
      hls: HighlightInfo[]
    ): HighlightInfo[] {
      const ret = new Array<HighlightInfo>();
      if (n.childNodes.length == 0) {
        return ret;
      }
      for (let i = 0; i < n.childNodes.length; i++) {
        const c = n.childNodes[i];
        const next = loopFindSibHighlight(c, hls);
        if (next.length > 0) {
          ret.push(...next);
        }
      }
      return ret;
    }
    function createNewHighlightWoOverlap(
      range: Range,
      markList: HighlightInfo[],
      id?: string | null
    ) {
      const startNode = range.startContainer;
      const endNode = range.endContainer;
      if (
        startNode.nodeType == Node.TEXT_NODE &&
        endNode.nodeType == Node.TEXT_NODE
      ) {
        // todo: this logic ignores the ones that are fully covered by the newly selected range
        const overlapedMark0 = findAncestorHighlighted(range.startContainer);
        const overlapedMark1 = findAncestorHighlighted(range.endContainer);
        let startNodePath = {
            selectorPath: getSelector(startNode.parentElement),
            textIndex: getTextIndex(startNode),
          },
          endNodePath = {
            selectorPath: getSelector(endNode.parentElement),
            textIndex: getTextIndex(endNode),
          };
        let startOffset = range.startOffset,
          endOffset = range.endOffset;
        let needCreateRange = false;

        if (overlapedMark0 != null) {
          needCreateRange = true;
          markList = markList.filter((h) => h.id != overlapedMark0.id);
          overlapedMark0.elementList.forEach((e) => unStyleIt(e));
          startNodePath = overlapedMark0.startNodePath;
          startOffset = overlapedMark0.startOffset;
        }
        if (overlapedMark1 != null) {
          needCreateRange = true;
          markList = markList.filter((h) => h.id != overlapedMark1.id);
          overlapedMark1.elementList.forEach((e) => unStyleIt(e));
          endNodePath = overlapedMark1.endNodePath;
          endOffset = overlapedMark1.endOffSet;
        }
        const hlNew = new HighlightInfo({
          id: id ?? "hl_" + Math.random().toString().slice(2),
          startNodePath: startNodePath,
          startOffset: startOffset,
          endNodePath: endNodePath,
          endOffSet: endOffset,
          color: hl.color,
          category: hl.category,
        });
        markList.splice(markList.length, 0, hlNew);
        const range2 = needCreateRange ? hlNew.createRange() : range;
        hlNew.textContent = range2.toString();
        return { hlNew: hlNew, rangeNew: range2, makersNew: markList };
      } else {
        console.error(
          "only support to highlight text elements, but got range:",
          range
        );
        return null;
      }
      // auxilary functions:
      function findAncestorHighlighted(n: Node): HighlightInfo {
        let hl: HighlightInfo = null;
        while (
          n.nodeName != "DIV" &&
          n.nodeName != "MAIN" &&
          n.nodeName != "BODY"
        ) {
          if (n.nodeName == MarkElement) {
            hl = markList.find((h) =>
              (n as HTMLElement).classList.contains(h.id)
            );
            if (hl !== undefined) {
              return hl;
            }
          }
          n = n.parentElement;
        }
        return null;
      }
    }
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
