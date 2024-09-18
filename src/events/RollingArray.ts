export class RollingArray<T> {
  private readonly items: T[] = [];

  constructor(readonly limit: number) {
    this.limit = limit;
  }

  add(item: T) {
    if (this.items.length >= this.limit) {
      this.items.shift(); // Remove the oldest item
    }
    this.items.push(item);
  }

  get(index: number) {
    return this.items[index];
  }

  size() {
    return this.items.length;
  }

  get values() {
    return [...this.items];
  }
}
