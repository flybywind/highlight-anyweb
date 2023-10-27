/**
 *
 * @param e Node
 * @returns true if the node only contains text elements
 */
export function textElement(e: Node): boolean {
  if (e.nodeType == Node.TEXT_NODE) {
    return true;
  }
  for (let i = 0; i < e.childNodes.length; i++) {
    const c = e.childNodes[i];
    if (!textElement(c)) {
      return false;
    }
  }
  return true;
}

export function getSelector(elm: HTMLElement) {
  if (elm.tagName === "BODY") return "body";
  const names: string[] = [];
  while (elm.parentElement && elm.tagName !== "BODY") {
    if (elm.id) {
      names.unshift("#" + elm.getAttribute("id")); // getAttribute, because `elm.id` could also return a child element with name "id"
      break; // Because ID should be unique, no more is needed. Remove the break, if you always want a full path.
    } else {
      let c = 1,
        e: Element = elm;
      for (; e.previousElementSibling; e = e.previousElementSibling, c++);
      names.unshift(elm.tagName.toLowerCase() + ":nth-child(" + c + ")");
    }
    elm = elm.parentElement;
  }
  return names.join(">");
}

export function getChildNodesIndex(n: Node) {
  let idx = 0;
  for (; n.previousSibling; n = n.previousSibling, idx++);
  return idx;
}

export function alignElement2SameLevel(
  n1: HTMLElement,
  n2: HTMLElement,
  ancestor: HTMLElement
) {
  let n1p, n2p;
  while (n1 !== ancestor) {
    n1p = n1;
    n1 = n1.parentElement;
  }
  while (n2 !== ancestor) {
    n2p = n2;
    n2 = n2.parentElement;
  }
  return [n1, n2];
}

interface StyleHighlight {
  "background-color": string;
  cursor: string;
}
export function styleIt(e: HTMLElement, style: StyleHighlight) {
  Object.getOwnPropertyNames(style).forEach((p) => {
    e.style.setProperty(p, style[p]);
  });
}
export function unStyleIt(e: HTMLElement) {
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
  //   CleanHighlightStore(e.id);
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
