import { expect, test } from "vitest";
import { OrderedMap } from "./OrderedMap";

interface Value {
  id: string;
  val: number;
}
test("order map", () => {
  const arr: Value[] = [
    { id: "a", val: 23 },
    { id: "xy", val: 100 },
  ];
  const m = new OrderedMap<string, Value>((v) => v.id, arr);
  expect(m.size()).eq(2);
  m.append({ id: "bc", val: 345 });
  expect(m.has("a")).true;
  expect(m.has("xy")).true;
  expect(m.has("bc")).true;
  expect(m.find("a").val).eq(23);
  expect(m.find("xy").val).eq(100);
  expect(m.find("bc").val).eq(345);
  expect(m.at(0).val).eq(23);
  expect(m.at(1).val).eq(100);
  expect(m.at(2).val).eq(345);

  m.removeByIdx(0);
  expect(m.has("a")).false;
  m.removeByKey("xy");
  expect(m.has("xy")).false;
  expect(m.size()).eq(1);
  expect(m.at(0).val).eq(345);

  m.append(arr[0]);
  m.append(arr[1]);
  m.append({ id: "bc", val: 123 });
  expect(m.at(0).val).eq(23);
  expect(m.at(1).val).eq(100);
  expect(m.at(2).val).eq(123);
  m.append({ id: "cd", val: 234 });
  m.append({ id: "de", val: 367 });
  m.shiftUpward(4, 1);
  expect(m.at(0)).deep.eq({ id: "a", val: 23 });
  expect(m.at(1)).deep.eq({ id: "de", val: 367 });
  expect(m.at(2)).deep.eq({ id: "xy", val: 100 });
  expect(m.at(3)).deep.eq({ id: "bc", val: 123 });
  expect(m.at(4)).deep.eq({ id: "cd", val: 234 });
});
