import { BehaviorSubject, Observable } from 'rxjs';

export declare type ValueResolver<T> = () => Promise<T>;
export declare type Resolver<T> = (key: number) => Promise<T>;
export declare type Modifier<T> = (old: T) => Promise<T>;

export interface IObservableHash<T> {
  [key: number]: LazyObservable<T>;
}

export class LazyObservable<T> {
  private readonly initialized = new BehaviorSubject<boolean>(false);
  private readonly value: BehaviorSubject<T>;

  constructor(defaultValue: T, resolver: ValueResolver<T>) {
    this.value = new BehaviorSubject<T>(defaultValue);

    resolver()
      .then((val) => {
        this.value.next(val);
        this.initialized.next(true);
      })
      .catch((err) => this.initialized.error(err));
  }

  get initialized$(): Observable<boolean> {
    return this.initialized.pipe();
  }

  get value$(): Observable<T> {
    return this.value.pipe();
  }

  async modify(modifier: Modifier<T>): Promise<void> {
    const newValue = await modifier(this.value.value);
    this.value.next(newValue);
  }
}

export class LazyObservableCache<T> {
  private readonly values: IObservableHash<T>;

  constructor(
    private defaultValue: T,
    private resolver: Resolver<T>,
  ) {
    this.values = {};
  }

  find(key: number): LazyObservable<T> {
    let existing = this.values[key] as LazyObservable<T>;
    if (!existing) {
      existing = new LazyObservable(this.defaultValue, () => this.resolver(key));
      this.values[key] = existing;
    }

    return existing;
  }

  has(key: number): boolean {
    return typeof this.values[key] !== 'undefined';
  }

  clear(key: number): void {
    delete this.values[key];
  }

  reset(): void {
    Object.keys(this.values).forEach((x) => this.clear(Number(x)));
  }
}
