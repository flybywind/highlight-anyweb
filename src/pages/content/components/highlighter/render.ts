import urlHighlightsStorage, {
  HighlightInfo,
  UrlHighlightMap,
} from "@root/src/shared/storages/url_highlights";
import { queryTabUrl } from "./background_msg";

const MarkElement = "SPAN";
function createHighlightElem(range: Range, hlInfo: HighlightInfo): Element {
  const resultNode = document.createElement(MarkElement);
  resultNode.appendChild(range.extractContents());
  const newStyle = { cursor: "pointer", "background-color": hlInfo.color };
  styleIt(resultNode, newStyle);
  // resultNode.style.cursor = "pointer";
  // resultNode.style.backgroundColor = color;
  resultNode.onclick = (ev: MouseEvent) => {
    unStyleIt(resultNode);
  };
  range.insertNode(resultNode);
  resultNode.id = hlInfo.id;
  return resultNode;
}
// TODO: if select multiple lines, the highlight disapear ...
/**
 * render highlight after page loaded.
 * @param range original selected range, probably need to merge with the overlapped ones
 * @param color color that user selected to highlight the text
 * @param category category that user selected to highlight the text
 * @param hlListMap highlights of all pages, got from useStorage
 * @returns
 */
export function RenderHighlightAfterLoad(
  range: Range,
  color: string,
  category: string,
  hlListMap: UrlHighlightMap
) {
  function createNewHighlightWoOverlap(
    range: Range,
    markList: HighlightInfo[]
  ) {
    const startNode = range.startContainer;
    const endNode = range.endContainer;
    if (
      startNode.nodeType == Node.TEXT_NODE &&
      endNode.nodeType == Node.TEXT_NODE
    ) {
      const parent0 = range.startContainer.parentElement;
      const parent1 = range.endContainer.parentElement;
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
      // todo: this logic ignores the ones that are fully covered by the newly selected range
      const overlapedMark0 =
        markList.length > 0 && parent0.nodeName == MarkElement
          ? markList.filter((h) => h.id == parent0.id)
          : null;
      const overlapedMark1 =
        markList.length > 0 && parent1.nodeName == MarkElement
          ? markList.filter((h) => h.id == parent1.id)
          : null;
      if (overlapedMark0 != null) {
        needCreateRange = true;
        markList = markList.filter((h) => h.id != overlapedMark0[0].id);
        unStyleIt(
          document.querySelector(MarkElement + "#" + overlapedMark0[0].id)
        );
        startNodePath = overlapedMark0[0].startNodePath;
        startOffset = overlapedMark0[0].startOffset;
      }
      if (overlapedMark1 != null) {
        needCreateRange = true;
        markList = markList.filter((h) => h.id != overlapedMark1[0].id);
        unStyleIt(
          document.querySelector(MarkElement + "#" + overlapedMark1[0].id)
        );
        endNodePath = overlapedMark1[0].endNodePath;
        endOffset = overlapedMark1[0].endOffSet;
      }
      const hlNew = new HighlightInfo({
        id: "hl_" + Math.random().toString().slice(2),
        startNodePath: startNodePath,
        startOffset: startOffset,
        endNodePath: endNodePath,
        endOffSet: endOffset,
        color: color,
        category: category,
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
  }

  queryTabUrl().then((url) => {
    let markList = hlListMap[url];
    if (markList == undefined) {
      markList = new Array<HighlightInfo>();
    }
    const { hlNew, rangeNew, makersNew } = createNewHighlightWoOverlap(
      range,
      markList
    );
    if (hlNew !== null) {
      hlListMap[url] = makersNew;
      createHighlightElem(rangeNew, hlNew);
      urlHighlightsStorage.set(hlListMap);
    }
  });
}

/**
 * render highlight list during page loading
 * @param range
 * @param hlInfo
 * @returns
 */
function RenderHighlight(range: Range, hlInfo: HighlightInfo) {
  const startNode = range.startContainer;
  const endNode = range.endContainer;
  if (
    startNode.nodeType == Node.TEXT_NODE &&
    endNode.nodeType == Node.TEXT_NODE
  ) {
    createHighlightElem(range, hlInfo);
  } else {
    console.error(
      "only support to highlight text elements, but got range:",
      range
    );
    return null;
  }
}

/**
 * render all old highlights made by user before during page loading
 */
export async function RenderStoredHighlights() {
  async function getAllHighlights() {
    const currentUrl = await queryTabUrl();
    const urlHighlights = await urlHighlightsStorage.get();
    const hls = urlHighlights[currentUrl];
    if (hls == undefined) {
      return Array<HighlightInfo>();
    }
    return hls;
  }
  const rangeList = await getAllHighlights();
  rangeList.forEach((hi) => {
    const range = new HighlightInfo(hi).createRange();
    if (range !== null) {
      RenderHighlight(range, hi);
    } else {
      console.error(`highlight: ${hi} not found in page`);
    }
  });
}

/**
 *
 * @param hlNew New highlight info waiting to be add in the store
 * @param delID if not empty, will delete the highlight item.
 */
export function CleanHighlightStore(delID) {
  queryTabUrl().then(async (url) => {
    const urlHighlights = await urlHighlightsStorage.get();
    let hls = urlHighlights[url];
    if (hls != undefined) {
      hls = hls.filter((h) => h.id != delID);
      urlHighlights[url] = hls;
      urlHighlightsStorage.set(urlHighlights);
    }
  });
}
interface StyleHighlight {
  "background-color": string;
  cursor: string;
}
function styleIt(e: HTMLElement, style: StyleHighlight) {
  Object.getOwnPropertyNames(style).forEach((p) => {
    e.style.setProperty(p, style[p]);
  });
}
function unStyleIt(e: HTMLElement) {
  let nextNode = e.nextSibling;
  const parentNode = e.parentNode;
  const leadNode = e.previousSibling;
  const ownChildNode = e.childNodes;
  let i = ownChildNode.length - 1;
  parentNode.removeChild(e);
  for (; i >= -1; i--) {
    let c;
    if (i == -1) {
      c = leadNode;
      if (c == null) {
        continue;
      }
      parentNode.removeChild(leadNode);
    } else {
      c = ownChildNode[i];
    }
    if (c.nodeName == nextNode.nodeName && c.nodeName != "#text") {
      // merge node
      const newNode = mergeNode(c, nextNode);
      if (newNode != null) {
        nextNode.replaceWith(newNode);
        nextNode = newNode as ChildNode;
        continue;
      }
    }
    parentNode.insertBefore(c, nextNode);
    nextNode = c;
  }
  CleanHighlightStore(e.id);
}
function mergeNode(n1: Node, n2: Node): Node {
  if (n1.nodeName != n2.nodeName) {
    console.error(
      `error happening when mergint two nodes of different type: ${n1.nodeName} vs ${n2.nodeName}`
    );
    return null;
  }
  if (n1.childNodes.length == n2.childNodes.length) {
    if (n1.nodeType == Node.TEXT_NODE) {
      return document.createTextNode(n1.textContent + n2.textContent);
    }
    const n3 = document.createElement(n1.nodeName);

    n1.childNodes.forEach((c, i) => {
      n3.appendChild(mergeNode(c, n2.childNodes[i]));
    });
    return n3;
  } else {
    console.error(
      `error happening when mergint two nodes of different structure: ${n1} vs ${n2}`
    );
    return null;
  }
}

function getSelector(elm: HTMLElement) {
  if (elm.tagName === "BODY") return "BODY";
  const names: string[] = [];
  while (elm.parentElement && elm.tagName !== "BODY") {
    if (elm.id) {
      names.unshift("#" + elm.getAttribute("id")); // getAttribute, because `elm.id` could also return a child element with name "id"
      break; // Because ID should be unique, no more is needed. Remove the break, if you always want a full path.
    } else {
      let c = 1,
        e: Element = elm;
      for (; e.previousElementSibling; e = e.previousElementSibling, c++);
      names.unshift(elm.tagName + ":nth-child(" + c + ")");
    }
    elm = elm.parentElement;
  }
  return names.join(">");
}

function getTextIndex(n: Node) {
  let idx = 0;
  for (; n.previousSibling; n = n.previousSibling, idx++);
  return idx;
}
