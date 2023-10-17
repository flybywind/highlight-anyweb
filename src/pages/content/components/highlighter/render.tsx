import { HighlightInfo } from "@root/src/shared/storages/url_highlights";
import ColorMap from "@root/src/shared/const/colors";
interface Prop {
  hl: HighlightInfo;
}
// highlight the range
export default function Render({ hl }: Prop) {
  return (
    <span
      className="highlight"
      style={{
        backgroundColor: ColorMap.get(hl.color),
        display: "inline",
      }}
    ></span>
  );
}
