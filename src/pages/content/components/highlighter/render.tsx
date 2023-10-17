import { HighlightInfo } from "@root/src/shared/storages/url_highlights";
interface Prop {
  hl: HighlightInfo;
}
// highlight the range
export default function Render({ hl }: Prop) {
  return (
    <span
      className="highlight"
      style={{
        backgroundColor: hl.color,
        display: "inline",
      }}
    ></span>
  );
}
