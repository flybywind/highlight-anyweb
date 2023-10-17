import UrlHighlightsStorage, {
  HighlightInfo,
} from "@root/src/shared/storages/url_highlights";
import { queryTabUrl } from "./background_msg";

export function RenderHighlight(range: Range, color: string) {
  const startNode = range.startContainer;
  const endNode = range.endContainer;
  if (startNode.nodeType == 3 && endNode.nodeType == 3) {
    const resultNode = document.createElement("i");
    resultNode.style.backgroundColor = color;
    resultNode.appendChild(range.extractContents());
    range.insertNode(resultNode);
    const hlNew: HighlightInfo = {
      startSelectorPath: getSelector(startNode.parentElement),
      startOffset: range.startOffset,
      endSelectorPath: getSelector(endNode.parentElement),
      endOffSet: range.endOffset,
      color: color,
    };
    return hlNew;
  } else {
    window.alert("only support to highlight text elements :)");
    return null;
  }
}

export async function RenderStoredHighlights() {
  const currentUrl = await queryTabUrl();
  async function getAllHighlights() {
    const urlHighlights = await UrlHighlightsStorage.get();
    const hls = urlHighlights.get(currentUrl);
    if (hls === undefined) {
      return Array<HighlightInfo>();
    }
    return hls;
  }
  const rangeList = await getAllHighlights();
  // todo
  console.log("url:", currentUrl, "range list: ", rangeList);
  rangeList.forEach((hi) => {
    const range = document.createRange();
    range.setStart(
      document.querySelector(hi.startSelectorPath),
      hi.startOffset
    );
    range.setEnd(document.querySelector(hi.endSelectorPath), hi.endOffSet);
    RenderHighlight(range, hi.color);
  });
}

export function UpdateHighlightStore(hlNew: HighlightInfo) {
  queryTabUrl().then(async (url) => {
    const urlHighlights = await UrlHighlightsStorage.get();
    let hls = urlHighlights.get(url);
    if (hls === undefined) {
      hls = Array<HighlightInfo>();
    }
    hls = [...hls, hlNew];
    urlHighlights.set(url, hls);
    UrlHighlightsStorage.set(urlHighlights);
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
