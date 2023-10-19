import { useEffect, useState } from "react";
import useStorage from "@src/shared/hooks/useStorage";
import tagListStore from "@src/shared/storages/custom_tags";
import recentTagStore from "@src/shared/storages/recent_tag";
import { HColor } from "@src/shared/const/colors";
import withErrorBoundary from "@src/shared/hoc/withErrorBoundary";
import withSuspense from "@src/shared/hoc/withSuspense";

import { preventDefault } from "./event";
import { RenderHighlightAfterLoad } from "./render";
import urlHighlightsStorage from "@root/src/shared/storages/url_highlights";

// callbacks for selection in global context
const getSelectedText = () => window.getSelection().toString();

// var qStr = getSelector(document.querySelector("div.moo"));
// alert(qStr);

interface Position {
  left: string;
  top: string;
  display: string;
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
  const tagList = useStorage(tagListStore);
  const recentTag = useStorage(recentTagStore);
  const hlListMap = useStorage(urlHighlightsStorage);
  function showMarkerAt(): Position {
    const currRange = window.getSelection().getRangeAt(0);
    const rangeBounds = currRange.getBoundingClientRect();
    setRange(currRange);
    return {
      left: rangeBounds.left + 20 + "px",
      top: rangeBounds.top - 30 + "px",
      display: "flex",
    };
  }

  function clickHandler(e: React.MouseEvent) {
    const node = e.target as HTMLElement;
    if (node !== undefined) {
      const markerNode = node.parentNode;
      const input = markerNode.querySelector("input") as HTMLInputElement;
      let category = input.value.length == 0 ? input.placeholder : input.value;
      if (node.classList.contains("color_circle")) {
        if (category.length == 0) {
          if (window.confirm("no category was provided, use default ?")) {
            category = "default";
          } else {
            return;
          }
        }
        recentTagStore.set(category);
        const color = node.style.backgroundColor;

        RenderHighlightAfterLoad(range, color, category, hlListMap);

        if (tagList.find((v) => v === category) === undefined) {
          tagListStore.set([...tagList, category]);
        }
      }
    }
  }
  return (
    <div
      id="highlighter-marker"
      style={{ position: "fixed", zIndex: "9999", ...pos }}
      onClick={(e) => preventDefault(e, clickHandler, e)}
    >
      {Object.values(HColor).map((c, i) => (
        <span
          key={i}
          className="color_circle"
          style={{ backgroundColor: c }}
        ></span>
      ))}
      <input type="text" list="my-highliter-tag-list" placeholder={recentTag} />
      <datalist id="my-highliter-tag-list">
        {tagList.map((t, i) => (
          <option key={i} value={t}>
            {t}
          </option>
        ))}
      </datalist>
    </div>
  );
}

export default withErrorBoundary(
  withSuspense(App, <div> Loading ... </div>),
  <div> Error Occur </div>
);
