/**
 *
 * @param e Node
 * @returns true if the node only contains text elements
 */
export function textElement(e: Node): boolean {
  if (e === null) return false;
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
  const newChildNodes = new Array<Node>();
  for (; i >= -1; i--) {
    let c: ChildNode;
    if (i == -1) {
      c = leadNode;
      if (c == null) {
        continue;
      }
      parentNode.removeChild(leadNode);
    } else {
      c = ownChildNode[i];
    }
    if (c.nodeName == nextNode.nodeName) {
      // merge node
      const newNode = mergeNode(c, nextNode);
      if (newNode != null) {
        newChildNodes.push(newNode);
        continue;
      }
    }
    parentNode.insertBefore(c, nextNode);
    newChildNodes.push(c);
    nextNode = c;
  }
  return newChildNodes;
}

/**
 * merge the node and save the content to second node
 * @param n1 first node in front of n2
 * @param n2 second node
 * @returns
 */
function mergeNode(n1: Node, n2: Node): Node {
  if (n1.nodeName != n2.nodeName) {
    throw new Error(
      `error happening when mergint two nodes of different type: ${n1.nodeName} vs ${n2.nodeName}`
    );
  }
  if (n1.nodeType == Node.TEXT_NODE) {
    n2.textContent = n1.textContent + n2.textContent;
    return n2;
  } else if (n1.nodeType == Node.ELEMENT_NODE) {
    while (n1.childNodes.length > 0) {
      n2.insertBefore(n1.lastChild, n2.firstChild);
    }
    return n2;
  } else {
    throw new Error(
      "can't merge two nodes of type: " + n1.nodeType + ", " + n2.nodeType
    );
  }
}

/**
 * DFS search the text node from the root
 * @param rootElem root element
 * @param callback accept the text node and handle them
 */
export function forEachTextNode(
  rootElem: Element,
  callback: (h: Node) => void
) {
  rootElem.childNodes.forEach((e) => {
    if (e.nodeType == Node.ELEMENT_NODE) {
      forEachTextNode(e as HTMLElement, callback);
    } else {
      if (e.nodeType == Node.TEXT_NODE) {
        callback(e);
      }
    }
  });
}
