export enum HColor {
  Orange,
  Yellow,
  Green,
  Turquoise,
  Cyan,
  Blue,
}

const ColorMap = new Map<HColor, string>([
  [HColor.Orange, "hsl(14, 100%, 53%)"],
  [HColor.Yellow, "hsl(44, 100%, 77%)"],
  [HColor.Green, "hsl(153, 53%, 53%)"],
  [HColor.Turquoise, "hsl(171, 100%, 41%)"],
  [HColor.Cyan, "hsl(207, 61%, 53%)"],
  [HColor.Blue, "hsl(229, 53%, 53%)"],
]);
export default ColorMap;
