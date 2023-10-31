import { vi, beforeEach, test, expect, describe } from "vitest";
import { JSDOM } from "jsdom";
import {
  HighlightSeq,
  HighlightInfo,
  HighlightOrderedMap,
  Tool,
  HighLightOriginColorAttr,
} from "./url_highlights";

import * as util from "./util";
const mockDocument = () =>
  new JSDOM(`
<!DOCTYPE html>
<html lang="en">
  
  <body>
    <h1>test mask solution</h1>
    <div class="box">
      <div class="test-origin">
        <p>An element receives a <code>click</code> event when a pointing device button (such as a mouse's primary mouse button) is both pressed and released while the pointer is <strong>located inside</strong> the element.</p>
        <p>If the <a href="#">button is <span>pressed</span></a> on one element and the pointer is moved outside the element before the button is released, the event is fired on the most specific ancestor element that</p>
      </div>
    </div>
  </body>
</html>
`);

describe("fundamental test", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    const { document, window, Node } = mockDocument().window;
    global.window = window;
    global.document = document;
    global.Node = Node;
    const originFn = util.getSelector;
    vi.spyOn(util, "getSelector").mockImplementation((e) => {
      const r = originFn(e);
      return r.toLowerCase();
    });
  });
  test("dom mock", () => {
    console.log("run test");
    const ele = document.querySelector(".box .test-origin");
    expect(ele).not.eq(null);
    expect(ele.childElementCount).eq(2);
  });
  test("func mock", () => {
    const e = document.querySelector(".test-origin") as HTMLElement;
    expect(util.getSelector(e)).eq("div:nth-child(2)>div:nth-child(1)");
  });
  test("check jsdom uppercase nodeName", () => {
    const mockDocument = new JSDOM(`
  <!DOCTYPE html>
  <html lang="en">
  <body>
    <h1>test mask solution</h1>
    <div class='box'>
      <div>
        <p id="p1"></p>
        <p id="p2"></p>
      </div>
    </div>
  </body>
  </html> `);
    const { document } = mockDocument.window;
    const result = document.querySelector("div.box");
    expect(result).not.null;
    const result1 = document.querySelector("DIV.box");
    expect(result1).to.null;
  });
});

describe("highlights operation", () => {
  let parentElem: HTMLElement,
    hl: HighlightInfo,
    hlarr: HighlightSeq,
    parentSelector: string;
  beforeEach(() => {
    vi.clearAllMocks();
    const originFn = util.getSelector;
    vi.spyOn(util, "getSelector").mockImplementation((e) => {
      const r = originFn(e);
      return r.toLowerCase();
    });

    const { document, window, Node } = mockDocument().window;
    global.window = window;
    global.document = document;
    global.Node = Node;
    parentSelector = ".box .test-origin p:nth-child(1)";
    parentElem = document.querySelector(parentSelector);
    hl = new HighlightInfo({
      id: "id1",
      parentSelector: parentSelector,
      textContent: "An element receives a click event",
      textStartAt: 0,
      textEndAt: 33,
      color: "green",
    });
  });

  test("> no overlap", () => {
    noOverLap((hls: HighlightOrderedMap) => {
      expect(hls.size()).eq(2);
      let hlIdx = 0;
      for (let i = 0; i < parentElem.childElementCount; i++) {
        const e = parentElem.children[i] as HTMLElement;
        if (Tool.isHighlightingElem(e)) {
          expect([
            `${hlIdx}th hle`,
            hlarr.highlights.at(hlIdx).textContent,
            hlarr.highlights.at(hlIdx).color,
          ]).deep.eq([
            `${hlIdx}th hle`,
            e.textContent,
            e.style.backgroundColor,
          ]);
          hlIdx++;
        }
      }
    });
  });
  test("> create highlight with range", () => {
    hlarr = new HighlightSeq([hl]);
    let range = document.createRange();
    let startNode = parentElem.childNodes[1],
      endNode = parentElem.childNodes[3];
    range.setStart(startNode, 111);
    range.setEnd(endNode, 4);
    hlarr.insertOneHighlightRange(range, "green", "abc", (hls) => {
      expect(hls.size()).eq(2);
      expect(hls.at(1).textContent).eq("pointer is located inside the");
    });
    range = document.createRange();
    startNode = parentElem.childNodes[1];
    endNode = parentElem.childNodes[1];
    range.setStart(startNode, 5);
    range.setEnd(endNode, 23);
    hlarr.insertOneHighlightRange(range, "orange", "xyz", (hls) => {
      expect(hls.size()).eq(3);
      expect(hls.at(2).textContent).eq(" a pointing device");
    });
  });

  test("> restore after no overlap", () => {
    noOverLap();
    const { document, Node } = mockDocument().window;
    global.document = document;
    global.Node = Node;
    const hlarr2 = new HighlightSeq(
      hlarr.highlights.map((h) => new HighlightInfo(h.storeAsConfig()))
    );
    expect(hlarr2.highlights.size()).eq(2);
    let hlIdx = 0;
    for (let i = 0; i < parentElem.childElementCount; i++) {
      const e = parentElem.children[i] as HTMLElement;
      if (Tool.isHighlightingElem(e)) {
        expect([
          `${hlIdx}th hle`,
          hlarr2.highlights.at(hlIdx).textContent,
          hlarr2.highlights.at(hlIdx).color,
        ]).deep.eq([`${hlIdx}th hle`, e.textContent, e.style.backgroundColor]);
        hlIdx++;
      }
    }
  });

  test("> encounter overlap", () => {
    encounterOverlap((hls: HighlightOrderedMap) => {
      expect(hls.size()).eq(3);

      const hlMap = new Array<{
        id: string;
        color: string;
        color0: string;
        content: string;
      }>();

      forEachHle(parentElem, (e) => {
        hlMap.push({
          id: Tool.getHighlightingID(e),
          color: e.style.backgroundColor,
          color0: e.getAttribute(HighLightOriginColorAttr),
          content: e.textContent,
        });
      });
      expect(hlMap.length).eq(4);
      expect(hlMap).deep.eq([
        {
          id: "id1",
          color: "green",
          color0: null,
          content: "An element receives a click",
        },
        {
          id: hls.at(2).id,
          color: "red",
          color0: null,
          content:
            " event when a pointing device button (such as a mouse's primary mouse button) is both",
        },
        { id: "id1", color: "red", color0: "green", content: " event" },
        {
          id: hls.at(1).id,
          color: "blue",
          color0: null,
          content: "pointer is located inside the",
        },
      ]);
    });
  });

  test("> restore after encounter overlap", () => {
    encounterOverlap();
    const lastInnerHtml = global.document.body.innerHTML;
    const { document, Node } = mockDocument().window;
    global.document = document;
    global.Node = Node;
    const hlarr2 = new HighlightSeq(
      hlarr.highlights.map((h) => new HighlightInfo(h.storeAsConfig()))
    );
    const hls = hlarr2.highlights;
    expect(hls.size()).eq(3);
    expect(document.body.innerHTML).eq(lastInnerHtml);
  });

  test("> insert-delete-restore with overlap", () => {
    encounterOverlap();
    const ele = hlarr.highlights.at(2);
    const contentbefore = parentElem.textContent;
    const htmlBefore = parentElem.innerHTML;
    const p0 = global.document.createElement(parentElem.nodeName);
    p0.innerHTML = htmlBefore;

    hlarr.deleteOneHighlight({ id: ele.id });
    const lastWholeContent = global.document.body.textContent;

    expect(hlarr.highlights.size()).eq(2);

    const contentafter = parentElem.textContent;
    const htmlAfter = parentElem.innerHTML;
    const p1 = global.document.createElement(parentElem.nodeName);
    p1.innerHTML = htmlAfter;
    console.log("inner html after delete:\n", htmlAfter);
    expect(contentafter).eq(contentbefore);
    expect(p0.querySelectorAll("span").length).eq(4);
    expect(p0.querySelectorAll("span>span").length).eq(1);
    expect(p1.querySelectorAll("span").length).eq(2);
    expect(p1.querySelectorAll("span>span").length).eq(0);

    // restore
    const { document, Node } = mockDocument().window;
    global.document = document;
    global.Node = Node;
    const hlarr2 = new HighlightSeq(
      hlarr.highlights.map((h) => new HighlightInfo(h.storeAsConfig()))
    );
    const hls = hlarr2.highlights;
    expect(hls.size()).eq(2);
    expect(document.body.textContent).eq(lastWholeContent);
  });

  function forEachHle(
    parentElem: HTMLElement,
    callback: (e: HTMLElement) => void
  ) {
    for (let i = 0; i < parentElem.childElementCount; i++) {
      const c = parentElem.children[i];
      if (c.nodeType == Node.ELEMENT_NODE) {
        const e = c as HTMLElement;

        if (Tool.isHighlightingElem(e)) {
          callback(e);
          forEachHle(e, callback);
        }
      }
    }
  }
  function noOverLap(cbk = null) {
    hlarr = new HighlightSeq([hl]);
    hl = new HighlightInfo({
      id: null,
      parentSelector: parentSelector,
      textStartAt: 144,
      textEndAt: 144 + 29,
      textContent: "pointer is located inside the",
      color: "green",
    });
    hlarr.insertOneHighlight(hl, cbk);
  }

  function encounterOverlap(cbk = null) {
    hlarr = new HighlightSeq([hl]);
    hl = new HighlightInfo({
      id: null,
      parentSelector: parentSelector,
      textStartAt: 144,
      textEndAt: 144 + 29,
      textContent: "pointer is located inside the",
      color: "blue",
    });
    hlarr.insertOneHighlight(hl, null);
    hl = new HighlightInfo({
      id: null,
      parentSelector: parentSelector,
      textStartAt: 27,
      textEndAt: 112,
      textContent:
        " event when a pointing device button (such as a mouse's primary mouse button) is both",
      color: "red",
    });
    hlarr.insertOneHighlight(hl, cbk);
  }
});
