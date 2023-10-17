import { useEffect, useState } from "react";
import useStorage from "@src/shared/hooks/useStorage";
import TagListStore from "@src/shared/storages/custom_tags";
import { HColor } from "@src/shared/const/colors";

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
// callbacks for selection in global context
const getSelectedText = () => window.getSelection().toString();

// var qStr = getSelector(document.querySelector("div.moo"));
// alert(qStr);

interface Position {
  display: string;
  left: string;
  top: string;
}

export default function App() {
  useEffect(() => {
    console.log("content view loaded");
  }, []);
  const defaultPos = { display: "none", left: "0px", top: "0px" } as Position;
  const [pos, setPos] = useState(defaultPos);
  const [tagList, setTagList] = useStorage(TagListStore);
  function showMarkerAt(): Position {
    const rangeBounds = window
      .getSelection()
      .getRangeAt(0)
      .getBoundingClientRect();
    return {
      // Substract width of marker button -> 40px / 2 = 20
      left: rangeBounds.left + rangeBounds.width / 2 - 20 + "px",
      top: rangeBounds.top - 30 + "px",
      display: "block",
    };
  }
  document.addEventListener("click", () => {
    if (getSelectedText().length > 0) {
      setPos(showMarkerAt());
    }
  });
  document.addEventListener("selectionchange", () => {
    if (getSelectedText().length == 0) {
      setPos(defaultPos);
    }
  });
  return (
    <div id="highlighter-marker" style={{ position: "fixed", ...pos }}>
      <span className={"color_circle c_" + HColor.Orange}></span>
      <span className={"color_circle c_" + HColor.Yellow}></span>
      <span className={"color_circle c_" + HColor.Green}></span>
      <span className={"color_circle c_" + HColor.Turquoise}></span>
      <span className={"color_circle c_" + HColor.Cyan}></span>
      <span className={"color_circle c_" + HColor.Blue}></span>
      <input type="text" list="my-highliter-tag-list">
        <datalist id="my-highliter-tag-list">
          {tagList.map((t, i) => (
            <option key={i} value={t}>
              {t}
            </option>
          ))}
        </datalist>
      </input>
      <span className="fa-solid fa-add add-tag"></span>
    </div>
  );
}
