import urlHighlightsStorage, {
  HighlightInfo,
} from "@root/src/shared/storages/url_highlights";
import { queryTabUrl } from "./background_msg";

interface StyleHighlight {
  "background-color": string;
  cursor: string;
}
function styleIt(e: HTMLElement, style: StyleHighlight) {
  Object.getOwnPropertyNames(style).forEach((p) => {
    e.style.setProperty(p, style[p]);
  });
}
function unStyleIt(e: HTMLElement, delAt: number) {
  // Object.getOwnPropertyNames(oriStyle).forEach((p) => {
  //   e.style.removeProperty(p);
  // });
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
  UpdateHighlightStore(null, null, delAt);
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
export function RenderHighlight(range: Range, color: string) {
  const startNode = range.startContainer;
  const endNode = range.endContainer;
  if (startNode.nodeType == 3 && endNode.nodeType == 3) {
    const hlNew: HighlightInfo = {
      startNodePath: {
        selectorPath: getSelector(startNode.parentElement),
        textIndex: getTextIndex(startNode),
      },
      startOffset: range.startOffset,
      endNodePath: {
        selectorPath: getSelector(endNode.parentElement),
        textIndex: getTextIndex(endNode),
      },
      endOffSet: range.endOffset,
      color: color,
    };
    const resultNode = document.createElement("span");
    resultNode.appendChild(range.extractContents());
    const newStyle = { cursor: "pointer", "background-color": color };
    styleIt(resultNode, newStyle);
    // resultNode.style.cursor = "pointer";
    // resultNode.style.backgroundColor = color;
    resultNode.onclick = (ev: MouseEvent) => {
      const idx = Number.parseInt(resultNode.className.split("_")[1]);
      unStyleIt(resultNode, idx);
    };
    const callbackafterStoreUpdate = (i: number) => {
      range.insertNode(resultNode);
      resultNode.className = Math.random().toString().slice(2) + "_" + i;
    };
    return { hlNew: hlNew, callback: callbackafterStoreUpdate };
  } else {
    window.alert("only support to highlight text elements :)");
    return null;
  }
}

export async function RenderStoredHighlights() {
  const currentUrl = await queryTabUrl();
  async function getAllHighlights() {
    const urlHighlights = await urlHighlightsStorage.get();
    const hls = urlHighlights[currentUrl];
    if (hls === undefined) {
      return Array<HighlightInfo>();
    }
    return hls;
  }
  const rangeList = await getAllHighlights();
  rangeList.forEach((hi, idx) => {
    const range = document.createRange();
    const startElem = document.querySelector(hi.startNodePath.selectorPath);
    const endElem = document.querySelector(hi.endNodePath.selectorPath);
    if (startElem !== undefined && endElem !== undefined) {
      const [startIdx, endIdx] = [
        hi.startNodePath.textIndex,
        hi.endNodePath.textIndex,
      ];
      if (
        startIdx < startElem.childNodes.length &&
        endIdx < endElem.childNodes.length
      ) {
        const startNode = startElem.childNodes[startIdx];
        const endNode = endElem.childNodes[endIdx];
        range.setStart(startNode, hi.startOffset);
        range.setEnd(endNode, hi.endOffSet);
        const { callback } = RenderHighlight(range, hi.color);
        callback(idx);
      } else {
        console.error(`highlight: ${hi} textnode out of boundary`);
      }
    } else {
      console.error(`highlight: ${hi} not found in page`);
    }
  });
}

export function UpdateHighlightStore(
  hlNew: HighlightInfo,
  callback: (i: number) => void,
  delAt = -1
) {
  queryTabUrl().then(async (url) => {
    const urlHighlights = await urlHighlightsStorage.get();
    let hls = urlHighlights[url];
    if (hls === undefined) {
      hls = Array<HighlightInfo>();
    }
    if (delAt == -1) {
      hls.splice(hls.length, 0, hlNew);
    } else {
      hls.splice(delAt, 1);
    }
    urlHighlights[url] = hls;
    urlHighlightsStorage.set(urlHighlights);
    if (delAt == -1) {
      callback(hls.length - 1);
    }
  });
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
        e = elm;
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
