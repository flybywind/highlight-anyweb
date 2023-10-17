import urlHighlightsStorage, {
  HighlightInfo,
} from "@root/src/shared/storages/url_highlights";
import { queryTabUrl } from "./background_msg";

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
    resultNode.style.backgroundColor = color;
    resultNode.appendChild(range.extractContents());
    range.insertNode(resultNode);
    return hlNew;
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
  rangeList.forEach((hi) => {
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
        RenderHighlight(range, hi.color);
      } else {
        console.error(`highlight: ${hi} textnode out of boundary`);
      }
    } else {
      console.error(`highlight: ${hi} not found in page`);
    }
  });
}

export function UpdateHighlightStore(hlNew: HighlightInfo) {
  queryTabUrl().then(async (url) => {
    const urlHighlights = await urlHighlightsStorage.get();
    let hls = urlHighlights[url];
    if (hls === undefined) {
      hls = Array<HighlightInfo>();
    }
    hls = [...hls, hlNew];
    urlHighlights[url] = hls;
    urlHighlightsStorage.set(urlHighlights);
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
