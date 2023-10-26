import { vi, beforeEach, test, expect, describe } from "vitest";
import { JSDOM } from "jsdom";
import {
  HighlightArray,
  HighlightInfo,
  HighlightOrderedMap,
} from "./url_highlights";
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
    const { document, Node } = mockDocument().window;
    global.document = document;
    global.Node = Node;
    console.log("setup document");
  });
  test("dom mock", () => {
    console.log("run test");
    const ele = document.querySelector(".box .test-origin");
    expect(ele).not.eq(null);
    expect(ele.childElementCount).eq(2);
  });

  test("selection mock", () => {
    const parentElem = document.querySelector(
      ".box .test-origin p:nth-child(1)"
    );
    const hl = new HighlightInfo({
      id: "id123",
      startNodePath: {
        selectorPath: ".box .test-origin p:nth-child(1)",
        textIndex: 0,
      },
      endNodePath: {
        selectorPath: ".box .test-origin p:nth-child(1)",
        textIndex: 2,
      },
      startOffset: 0,
      endOffSet: 37,
      color: "green",
    });
    const range = hl.createRange();
    expect(range).not.eq(null);
    expect(range.startContainer.parentElement).eq(parentElem);
    expect(range.endContainer.parentElement).eq(parentElem);
    expect(range.toString()).eq(
      "An element receives a click event when a pointing device button "
    );
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
    // const result = document.querySelector(
    //   "div:nth-child(2)>div:nth-child(1)>p:nth-child(1)"
    // );
    // expect(result).not.null;
    // expect(result.id).eq("p1");
    // const result2 = document.querySelector(
    //   "DIV:nth-child(2)>DIV:nth-child(1)>P:nth-child(1)"
    // );
    // expect(result2).to.null;

    const result = document.querySelector("div.box");
    expect(result).not.null;
    const result1 = document.querySelector("DIV.box");
    expect(result1).to.null;
  });
});

describe("insert selections", () => {
  let parentElem: HTMLElement, hl: HighlightInfo, hlarr: HighlightArray;
  beforeEach(() => {
    vi.clearAllMocks();
    const { document, Node } = mockDocument().window;
    global.document = document;
    global.Node = Node;
    parentElem = document.querySelector(".box .test-origin p:nth-child(1)");
    hl = new HighlightInfo({
      id: "id1",
      startNodePath: {
        selectorPath: ".box .test-origin p:nth-child(1)",
        textIndex: 0,
      },
      endNodePath: {
        selectorPath: ".box .test-origin p:nth-child(1)",
        textIndex: 2,
      },
      startOffset: 0,
      endOffSet: 6,
      color: "green",
    });
  });

  test("> no overlap", () => {
    noOverLap((hls: HighlightOrderedMap) => {
      expect(hls.size()).eq(2);
      const firstElem = hls.at(0).elementList[0];
      expect(firstElem.parentElement).toBe(parentElem);
      expect(HighlightInfo.getHighlightingID(firstElem)).eq("id1");

      const id2 = hls.at(1).id;
      const secondElem = hls.at(1).elementList[0];
      expect(secondElem.parentElement).toBe(parentElem);
      expect(HighlightInfo.getHighlightingID(secondElem)).eq(id2);
    });
  });

  test("> restore after no overlap", () => {
    noOverLap();
    const { document, Node } = mockDocument().window;
    global.document = document;
    global.Node = Node;
    parentElem = document.querySelector(".box .test-origin p:nth-child(1)");
    const hlarr2 = new HighlightArray(
      hlarr.highlights.map((h) => new HighlightInfo(h.storeAsConfig()))
    );
    const hls = hlarr2.highlights;
    expect(hls.size()).eq(2);
    const firstElem = hls.at(0).elementList[0];
    expect(firstElem.parentElement).toBe(parentElem);
    expect(HighlightInfo.getHighlightingID(firstElem)).eq("id1");

    const secondElem = hls.at(1).elementList[0];
    expect(secondElem.parentElement).toBe(parentElem);
    expect(HighlightInfo.isHighlightingElem(secondElem)).to.true;
  });

  test("> encounter overlap", () => {
    encounterOverlap((hls: HighlightOrderedMap) => {
      expect(hls.size()).eq(3);
      const firstElem = hls.at(0).elementList[0];
      expect(firstElem.parentElement).toBe(parentElem);
      expect(HighlightInfo.getHighlightingID(firstElem)).eq("id1");
      expect(firstElem.childNodes[firstElem.childNodes.length - 1].nodeName).eq(
        "CODE"
      );
      expect(
        firstElem.childNodes[firstElem.childNodes.length - 1].textContent
      ).eq("cli");

      const secondElem = hls.at(1).elementList[0];
      expect(secondElem.parentElement).eq(parentElem);
      expect(secondElem.childNodes[0].nodeName).eq("CODE");
      expect(secondElem.childNodes[0].textContent).eq("ck");
    });
  });

  test("> restore after encounter overlap", () => {
    encounterOverlap();
    const lastInnerHtml = global.document.body.innerHTML;
    const { document, Node } = mockDocument().window;
    global.document = document;
    global.Node = Node;
    parentElem = document.querySelector(".box .test-origin p:nth-child(1)");
    const hlarr2 = new HighlightArray(
      hlarr.highlights.map((h) => new HighlightInfo(h.storeAsConfig()))
    );
    const hls = hlarr2.highlights;
    expect(hls.size()).eq(3);
    expect(document.body.innerHTML).eq(lastInnerHtml);
  });

  function noOverLap(cbk = null) {
    hlarr = new HighlightArray([hl]);
    hl = new HighlightInfo({
      id: null,
      startNodePath: {
        selectorPath: ".box .test-origin p:nth-child(1)",
        textIndex: 1,
      },
      endNodePath: {
        selectorPath: ".box .test-origin p:nth-child(1)",
        textIndex: 3,
      },
      startOffset: 110,
      endOffSet: 8,
      color: "green",
    });
    hlarr.insertOneHighlight(hl, cbk);
  }

  function encounterOverlap(cbk = null) {
    hlarr = new HighlightArray([hl]);
    hl = new HighlightInfo({
      id: null,
      startNodePath: {
        selectorPath: ".box .test-origin p:nth-child(1)",
        textIndex: 1,
      },
      endNodePath: {
        selectorPath: ".box .test-origin p:nth-child(1)",
        textIndex: 3,
      },
      startOffset: 110,
      endOffSet: 8,
      color: "green",
    });
    hlarr.insertOneHighlight(hl, null);
    hl = new HighlightInfo({
      id: null,
      startNodePath: {
        selectorPath: ".box .test-origin p:nth-child(1)>span:nth-child(1)>code",
        textIndex: 0,
      },
      endNodePath: {
        selectorPath: ".box .test-origin p:nth-child(1)",
        textIndex: 1,
      },
      startOffset: 3,
      endOffSet: 29,
      color: "red",
    });
    hlarr.insertOneHighlight(hl, cbk);
  }
});
