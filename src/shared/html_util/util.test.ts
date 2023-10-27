import { vi, beforeEach, test, expect, describe } from "vitest";
import { JSDOM } from "jsdom";
import { forEachTextNode } from "./util";

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
    </div>
  </body>
</html>
`);

beforeEach(() => {
  vi.clearAllMocks();
  const { document, Node } = mockDocument().window;
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
