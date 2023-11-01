import { useEffect, useState, useRef } from "react";
import useStorage from "@src/shared/hooks/useStorage";
import tagListStore from "@src/shared/storages/custom_tags";
import recentTagStore from "@src/shared/storages/recent_tag";
import urlHighlightsStorage from "@src/shared/storages/url_highlights";
import { HColor } from "@src/shared/const/colors";
import withErrorBoundary from "@src/shared/hoc/withErrorBoundary";
import withSuspense from "@src/shared/hoc/withSuspense";

import {
  HighlightInfo,
  HighlightOrderedMap,
  HighlightSeq,
  Tool,
} from "@src/shared/html_util/url_highlights";

import { queryTabUrl } from "../../utils/background_msg";
import { preventDefault } from "../../utils/event";
// callbacks for selection in global context
const getSelectedText = () => window.getSelection().toString();

interface Position {
  left: string;
  top: string;
  display: string;
}

function App() {
  const defaultPos = { display: "none", left: "0px", top: "0px" } as Position;
  const inputRef = useRef(null);
  const [hlRange, setHlRange] = useState({} as Range);
  const [pos, setPos] = useState(defaultPos);
  const [hlSeq, setHLSeq] = useState({} as HighlightSeq);
  const [hlID, setHLID] = useState(""); // current active highlight id
  let hlLoaded = false;
  useEffect(() => {
    document.addEventListener("click", () => {
      if (getSelectedText().length > 0) {
        setPos(showMarkerAt());
        const sel = document.getSelection();
        const range = sel.getRangeAt(0);
        setHlRange(range);
      } else {
        setPos(defaultPos);
      }
      setHLID(null);
    });
    // document.addEventListener("mousemove", (ev) => {
    //   console.log("mouse position: ", ev.clientX, ev.clientY);
    // });
    if (!hlLoaded) {
      queryTabUrl().then((url) => {
        let curHlist = hlListMap[url];
        if (curHlist === undefined) {
          curHlist = [];
        }
        const hlseq0 = new HighlightSeq(curHlist);
        hlseq0.setClickHLHander(clickHLHandler);
        setHLSeq(hlseq0);
        console.log("load all highlihgts from storage:", curHlist);
      });
      hlLoaded = true;
    }
  }, []);
  const tagList = useStorage(tagListStore);
  const recentTag = useStorage(recentTagStore);
  const hlListMap = useStorage(urlHighlightsStorage);
  function showMarkerAt(): Position {
    const currRange = window.getSelection().getRangeAt(0);
    const rangeBounds = currRange.getBoundingClientRect();
    return {
      left: rangeBounds.left + 20 + "px",
      top: rangeBounds.top - 30 + "px",
      display: "flex",
    };
  }

  function clickHLHandler(hle: HTMLElement) {
    const rangeBounds = hle.getBoundingClientRect();
    setPos({
      left: rangeBounds.left + 20 + "px",
      top: rangeBounds.top - 30 + "px",
      display: "flex",
    });
    setHLID(Tool.getHighlightingID(hle));
    // todo
    // - update category
    // - show comments
  }
  function clickColorHandler(color: string) {
    if (color === null) {
      // delete highlight
      if (hlID !== null) {
        hlSeq.deleteOneHighlight({ id: hlID }, storageCbk);
        setHLID(null);
      }
    } else {
      const input = inputRef.current as HTMLInputElement;
      let category = input.value.length == 0 ? input.placeholder : input.value;
      if (category.length == 0) {
        if (window.confirm("no category was provided, use default ?")) {
          category = "default";
        } else {
          return;
        }
      }
      recentTagStore.set(category);

      hlSeq.insertOneHighlightRange(hlRange, color, category, storageCbk);
      if (tagList.find((v) => v === category) === undefined) {
        tagListStore.set([...tagList, category]);
      }
    }
    function storageCbk(hls: HighlightOrderedMap) {
      queryTabUrl().then((url) => {
        const curHlist = hls.map((h) => h.storeAsConfig());
        hlListMap[url] = curHlist;
        urlHighlightsStorage.set(hlListMap);
      });
    }
  }
  return (
    <>
      <div
        id="highlighter-marker"
        style={{ position: "fixed", zIndex: "9999", ...pos }}
      >
        {Object.values(HColor).map((c, i) => (
          <span
            key={i}
            className="color_circle"
            style={{ backgroundColor: c }}
            onClick={(e) => preventDefault(e, clickColorHandler, c)}
          ></span>
        ))}
        <span
          className="color_circle delete"
          onClick={(e) => preventDefault(e, clickColorHandler, null)}
        >
          {"x"}
        </span>
        <input
          type="text"
          list="my-highliter-tag-list"
          placeholder={recentTag}
          ref={inputRef}
        />
        <datalist id="my-highliter-tag-list">
          {tagList.map((t, i) => (
            <option key={i} value={t}>
              {t}
            </option>
          ))}
        </datalist>
      </div>
    </>
  );
}

export default withErrorBoundary(
  withSuspense(App, <div> Loading ... </div>),
  <div> Error Occur </div>
);
