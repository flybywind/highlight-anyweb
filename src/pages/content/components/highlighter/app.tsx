import { useEffect, useState } from "react";
import useStorage from "@src/shared/hooks/useStorage";
import TagListStore from "@src/shared/storages/custom_tags";
import { HColor } from "@src/shared/const/colors";
import withErrorBoundary from "@src/shared/hoc/withErrorBoundary";
import withSuspense from "@src/shared/hoc/withSuspense";

import { preventDefault } from "./event";
import { UpdateHighlightStore, RenderHighlight } from "./render";

// callbacks for selection in global context
const getSelectedText = () => window.getSelection().toString();

// var qStr = getSelector(document.querySelector("div.moo"));
// alert(qStr);

interface Position {
  left: string;
  top: string;
}

function App() {
  const defaultPos = { display: "none", left: "0px", top: "0px" } as Position;
  const [pos, setPos] = useState(defaultPos);
  const [range, setRange] = useState(document.createRange());

  useEffect(() => {
    document.addEventListener("click", () => {
      if (getSelectedText().length > 0) {
        setPos(showMarkerAt());
      } else {
        setPos(defaultPos);
      }
    });
  }, []);
  const tagList = useStorage(TagListStore);
  function showMarkerAt(): Position {
    const currRange = window.getSelection().getRangeAt(0);
    const rangeBounds = currRange.getBoundingClientRect();
    setRange(currRange);
    return {
      left: rangeBounds.left + 20 + "px",
      top: rangeBounds.top - 30 + "px",
    };
  }

  function clickHandler(e: React.MouseEvent) {
    const node = e.target as HTMLElement;
    if (node !== undefined) {
      const markerNode = node.parentNode;
      const input = markerNode.querySelector("input") as HTMLInputElement;
      let category = input.value;
      if (node.classList.contains("color_circle")) {
        if (category.length == 0) {
          if (window.confirm("no category was provided, use default ?")) {
            category = "default";
          } else {
            return;
          }
        }
        const color = node.style.backgroundColor;
        console.log(
          "change background color to",
          color,
          "category =",
          category
        );
        const hlNew = RenderHighlight(range, color);
        UpdateHighlightStore(hlNew);
      } else if (node.classList.contains("add-tag")) {
        if (category.length == 0) {
          window.alert("plz provide the category name in the edit box :)");
        } else {
          TagListStore.set([...tagList, category]);
        }
      }
    }
  }
  return (
    <div
      id="highlighter-marker"
      style={{ position: "fixed", ...pos }}
      onClick={(e) => preventDefault(e, clickHandler, e)}
    >
      {Object.values(HColor).map((c, i) => (
        <span
          key={i}
          className="color_circle"
          style={{ backgroundColor: c }}
        ></span>
      ))}
      <input
        type="text"
        list="my-highliter-tag-list"
        placeholder="category ..."
      />
      <datalist id="my-highliter-tag-list">
        {tagList.map((t, i) => (
          <option key={i} value={t}>
            {t}
          </option>
        ))}
      </datalist>
      <span className="fa-solid fa-add add-tag"></span>
    </div>
  );
}

export default withErrorBoundary(
  withSuspense(App, <div> Loading ... </div>),
  <div> Error Occur </div>
);
