export class OrderedMap<K, V> {
  private _arr: V[];
  private _map: Map<K, V>;
  private _keyBy: (v: V) => K;

  constructor(keyBy: (v: V) => K, arr: V[] = null) {
    this._arr = new Array<V>();
    if (arr !== null) {
      this._arr.push(...arr);
    }
    this._keyBy = keyBy;
    this._map = new Map<K, V>();
    this._arr.forEach((i) => this._map.set(this._keyBy(i), i));
  }

  append(v: V) {
    const k = this._keyBy(v);
    if (this.has(k)) {
      const idx = this._arr.findIndex((v) => this._keyBy(v) == k);
      this._arr.splice(idx, 1);
    }
    this._map.set(k, v);
    this._arr.push(v);
  }

  /**
   * shift the element upward from i to j
   * @param i the original position of the element
   * @param j the new position of the element, all the following elements will be moved back by one position
   */
  shiftUpward(i: number, j: number) {
    // assert(i > j, `i should > j, but got [${i}, ${j}]`);
    let t = this._arr[j];
    this._arr[j] = this._arr[i];
    for (j = j + 1; j <= i; j++) {
      [this._arr[j], t] = [t, this._arr[j]];
    }
  }
  /**
   * return the value given k, if not found, undefined will be return
   * @param k key
   * @returns value
   */
  find(k: K): V {
    return this._map.get(k);
  }
  findIdx(k: K): number {
    return this._arr.findIndex((v) => this._keyBy(v) === k);
  }
  at(i: number): V {
    return this._arr[i];
  }

  has(k: K): boolean {
    return this.find(k) != undefined;
  }

  map<V2>(t: (v: V) => V2): V2[] {
    return this._arr.map((v) => t(v));
  }
  size(): number {
    return this._arr.length;
  }
  removeByIdx(idx: number) {
    const key = this._keyBy(this._arr[idx]);
    this._remove_val_(idx, key);
  }
  removeByKey(key: K) {
    const idx = this.findIdx(key);
    this._remove_val_(idx, key);
  }

  private _remove_val_(idx: number, key: K) {
    this._map.delete(key);
    this._arr.splice(idx, 1);
  }
}
