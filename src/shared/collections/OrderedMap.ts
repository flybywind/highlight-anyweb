import assert from "assert";

export class OrderedMap<K, V> {
  arr: V[];
  map: Map<K, V>;
  keyBy: (v: V) => K;

  constructor(keyBy: (v: V) => K, arr: V[] = null) {
    this.arr = new Array<V>();
    this.arr.push(...arr);
    this.keyBy = keyBy;
    this.map = new Map<K, V>();
    this.arr.forEach((i) => this.map.set(this.keyBy(i), i));
  }

  append(v: V) {
    const k = this.keyBy(v);
    if (this.has(k)) {
      const idx = this.arr.findIndex((v) => this.keyBy(v) == k);
      this.arr.splice(idx, 1);
    }
    this.map.set(k, v);
    this.arr.push(v);
  }

  /**
   * shift the element upward from i to j
   * @param i the original position of the element
   * @param j the new position of the element, all the following elements will be moved back by one position
   */
  shiftUpward(i: number, j: number) {
    assert(i > j, `i should > j, but got [${i}, ${j}]`);
    let t = this.arr[j];
    this.arr[j] = this.arr[i];
    for (j = j + 1; j <= i; j++) {
      [this.arr[j], t] = [t, this.arr[j]];
    }
  }
  /**
   * return the value given k, if not found, undefined will be return
   * @param k key
   * @returns value
   */
  find(k: K): V {
    return this.map.get(k);
  }

  at(i: number): V {
    return this.arr[i];
  }

  has(k: K): boolean {
    return this.find(k) != undefined;
  }

  removeByIdx(idx: number) {
    const key = this.keyBy(this.arr[idx]);
    this._remove_val_(idx, key);
  }
  removeByKey(key: K) {
    const idx = this.arr.findIndex((v) => this.keyBy(v) === key);
    this._remove_val_(idx, key);
  }

  private _remove_val_(idx: number, key: K) {
    this.map.delete(key);
    this.arr.splice(idx, 1);
  }

  size(): number {
    return this.arr.length;
  }
}
