import { useRef, useEffect } from "react";
interface Prop {
  selector: string;
  id: string;
}

export default function MarkerComponent({ selector, id }: Prop) {
  const refMarker = useRef(null);
  const parentElem = document.querySelector(selector);
  const clientRect = parentElem.getBoundingClientRect();
  const innerElem = parentElem.outerHTML;

  useEffect(() => {
    document.body.addEventListener("mousemove", (ev: MouseEvent) => {
        const rect = (refMarker.current as HTMLElement).getBoundingClientRect();
        if ()
    })
  }, []);
  return (
    <div
      ref={refMarker}
      dangerouslySetInnerHTML={{ __html: innerElem }}
      style={{
        position: "fixed",
        top: clientRect.top + "px",
        left: clientRect.left + "px",
        display: "block",
        backgroundColor: "transparent",
        color: "transparent",
        zIndex: "9999",
      }}
    ></div>
  );
}
