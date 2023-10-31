import { vi, beforeEach, test, expect, describe } from "vitest";
import { JSDOM } from "jsdom";
import { forEachTextNode } from "./util";
import { Tool } from "./url_highlights";

const mockDocument = () =>
  new JSDOM(`
<!DOCTYPE html>
<html lang="en">
  
  <body>
    <h1>test mask solution</h1>
    <div class="box">
      <div class="test-origin">
        <p>An element receives a <code>click</code> event when a pointing device button (such as a <a href='#'>mouse's primary <i>mouse button</i></a>) is both pressed and released while the pointer is <strong>located inside</strong> the element.</p>
        <p>If the <a href="#">button is <span>pressed</span></a> on one element and the pointer is moved outside the element before the button is released, the event is fired on the most specific ancestor element that</p>
      </div>
      <div class="test-origin-3p">
        <p>An element receives a <code>click</code> event when a pointing device button (such as a <a href='#'>mouse's primary <i>mouse button</i></a>) is both pressed and released while the pointer is <strong>located inside</strong> the element.</p>
        <p>If the <a href="#">button is <span>pressed</span></a> on one element and the pointer is moved outside the element before the button is released, the event is fired on the most specific ancestor element that</p>
        <p>If the <a href="#">button is <span>pressed</span></a> on one element and the pointer is moved outside the element before the button is released, the event is fired on the most specific ancestor element that</p>
      </div>
    </div>
    <div class="box2">
        <div class="test-origin">
            <p>An element receives a <code>click</code> event when a pointing device button (such as a <a href='#'>mouse's primary <i>mouse button</i></a>) is both pressed and released while the pointer is <strong>located inside</strong> the element.</p>
        </div>
    </div>
  </body>
</html>
`);

beforeEach(() => {
  vi.clearAllMocks();
  const { document, Node, window } = mockDocument().window;
  global.window = window;
  global.document = document;
  global.Node = Node;
});

test("foreach text node", () => {
  const strBuf = Buffer.alloc(1024);
  let bufN = 0;
  let nodeN = 0;
  const p0 = document.querySelector(".test-origin>p:nth-child(1)");
  forEachTextNode(p0, (n) => {
    expect(n.nodeType).eq(Node.TEXT_NODE);
    nodeN++;
    if (nodeN == 1) {
      expect([nodeN, n.textContent]).deep.eq([nodeN, "An element receives a "]);
    }
    if (nodeN == 2) {
      expect([nodeN, n.textContent]).deep.eq([nodeN, "click"]);
    }
    if (nodeN == 5) {
      expect([nodeN, n.textContent]).deep.eq([nodeN, "mouse button"]);
    }
    bufN += strBuf.write(n.textContent, bufN);
  });
  expect(nodeN).eq(8);
  const extractStr = strBuf.toString("utf8", 0, bufN);
  const expectPureText =
    "An element receives a click event when a pointing device button (such as a mouse's primary mouse button) is both pressed and released while the pointer is located inside the element.";
  expect(extractStr.length).deep.eq(expectPureText.length);
  expect(extractStr).deep.eq(expectPureText);
});

test("createHLConfWRange -- end at last element", () => {
  const para = document.querySelector(".test-origin>p:nth-child(1)");
  const para1 = document.querySelector(".test-origin>p:nth-child(2)>a>span");
  const range = document.createRange();
  range.setStart(para.childNodes[0], 3);
  range.setEnd(para1.childNodes[0], 4);

  const rangeArr = Tool.createHLConfWRange(range, {
    color: "red",
    category: "abc",
  });

  expect(rangeArr.length).eq(2);
  expect(rangeArr[0].textStartAt).eq(3);
  expect(rangeArr[0].parentSelector).not.undefined;
  expect(rangeArr[0].textContent).eq(
    "element receives a click event when a pointing device button (such as a mouse's primary mouse button) is both pressed and released while the pointer is located inside the element."
  );
  expect(rangeArr[0].textEndAt).eq(182);
  expect(rangeArr[0].category).eq("abc");

  expect(rangeArr[1].textStartAt).eq(0);
  expect(rangeArr[1].parentSelector).not.undefined;
  expect(rangeArr[1].textContent).eq("If the button is pres");
  expect(rangeArr[1].textEndAt).eq(21);
  expect(rangeArr[1].category).eq("abc");
});

test("createHLConfWRange -- end at 2nd last element", () => {
  const para = document.querySelector(".test-origin-3p>p:nth-child(1)");
  const para1 = document.querySelector(".test-origin-3p>p:nth-child(2)>a>span");
  const range = document.createRange();
  range.setStart(para.childNodes[0], 3);
  range.setEnd(para1.childNodes[0], 4);

  const rangeArr = Tool.createHLConfWRange(range, {
    color: "red",
    category: "abc",
  });

  expect(rangeArr.length).eq(2);
  expect(rangeArr[0].textStartAt).eq(3);
  expect(rangeArr[0].textContent).eq(
    "element receives a click event when a pointing device button (such as a mouse's primary mouse button) is both pressed and released while the pointer is located inside the element."
  );
  expect(rangeArr[0].textEndAt).eq(182);

  expect(rangeArr[1].textStartAt).eq(0);
  expect(rangeArr[1].textContent).eq("If the button is pres");
  expect(rangeArr[1].textEndAt).eq(21);
});

test("createHLConfWRange -- cross multiple layer of div", () => {
  const para = document.querySelector(".test-origin-3p>p:nth-child(3)>a>span");
  const para1 = document.querySelector(".box2 .test-origin>p:nth-child(1)");
  const range = document.createRange();
  range.setStart(para.childNodes[0], 4);
  range.setEnd(para1.childNodes[2], 6);

  const rangeArr = Tool.createHLConfWRange(range, {
    color: "red",
    category: "abc",
  });

  expect(rangeArr.length).eq(2);
  expect(rangeArr[0].textStartAt).eq(21);
  expect(rangeArr[0].textEndAt).eq(177);
  expect(rangeArr[0].textContent).eq(
    "sed on one element and the pointer is moved outside the element before the button is released, the event is fired on the most specific ancestor element that"
  );
  expect(rangeArr[1].textStartAt).eq(0);
  expect(rangeArr[1].textEndAt).eq(33);
  expect(rangeArr[1].textContent).eq("An element receives a click event");
});

test("forEach break", () => {
  class StopIter implements Error {
    name: string;
    message: string;
    constructor(msg: string = null) {
      this.message = msg;
      this.name = "stopIter";
    }
  }
  const arr = [
    [1, 2],
    [3, 4, 5],
    [6, 7],
  ];
  expect(() => {
    try {
      arr.forEach((v, i) => {
        v.forEach((n, j) => {
          console.log(`${i}th arr: at ${j} => ${n}`);
          if (n == 4) {
            throw new StopIter();
          }
        });
      });
    } catch (err) {
      if (err instanceof StopIter) {
        return;
      } else {
        throw err;
      }
    }
  }).not.throw();

  expect(() => {
    try {
      arr.forEach((v, i) => {
        v.forEach((n, j) => {
          console.log(`${i}th arr: at ${j} => ${n}`);
          if (n == 4) {
            throw new Error("unknow");
          }
        });
      });
    } catch (err) {
      if (err instanceof StopIter) {
        return;
      } else {
        throw err;
      }
    }
  }).throw("unknow");
});
