/* eslint-disable @typescript-eslint/no-explicit-any */
import { ITransactionOperation, executeTransaction } from './Transactions';
import { BehaviorSubject, combineLatest, firstValueFrom, Observable, map } from 'rxjs';

export interface IWizardStepSource<T, Params> {
  load(params: Params): Promise<T>;
}

export class WizardStepSource<T, Params> implements IWizardStepSource<T, Params> {
  constructor(private readonly inner: (params: Params) => Promise<T>) {}

  load(params: Params): Promise<T> {
    return this.inner(params);
  }
}

export interface UpdateWizardState {
  property: string;
  value: any;
  previous: any;
}

export interface IWizardStep<Params> {
  // Resets the state of the step which effectively does two things: 1. It sets the value of the underlying observable to the defaultValue defined for the step 2. It calls load() on the configured IWizardStepSource
  resetState(params: Params): Promise<void>;
  buildOperation(): ITransactionOperation;
  isDirty(): boolean;
  changes$: Observable<UpdateWizardState[]>;
  initialized$: Observable<boolean>;
  key: string;
}

export interface WizardStepOptions<Model, Params> {
  key: string;
  source: IWizardStepSource<Model, Params>;
  defaultValue: Model;
  operation: IWizardOperation<Model>;
}

export interface IWizardOperation<Model> {
  execute(values: Partial<Model>, changes: UpdateWizardState[], current: Model): Promise<void>;
}

export class WizardStep<Model extends object, Params = any> implements IWizardStep<Params> {
  private readonly current: BehaviorSubject<Model>;
  private readonly initialized = new BehaviorSubject<boolean>(false);
  private readonly previous: BehaviorSubject<Model | undefined> = new BehaviorSubject<Model | undefined>(undefined);

  constructor(private readonly options: WizardStepOptions<Model, Params>) {
    this.current = new BehaviorSubject<Model>(this.options.defaultValue);
  }

  get key(): string {
    return this.options.key;
  }

  get changes$(): Observable<UpdateWizardState[]> {
    return combineLatest([this.current, this.previous]).pipe(
      map(([current, previous]) => diffState(previous as Model, current)),
    );
  }

  get initialized$(): Observable<boolean> {
    return this.initialized.pipe();
  }

  get model(): Model {
    return this.current.value;
  }

  get previousModel(): Model | undefined {
    return this.previous.value;
  }

  rollbackToPrevious(): void {
    const previous = this.previous.value;
    this.previous.next(undefined);
    this.current.next(previous as Model);
  }

  save(value: Model): void {
    this.previous.next(this.current.value);
    this.current.next(value);
  }

  async resetState(params: Params): Promise<void> {
    const value = await this.options.source.load(params);
    this.current.next(value);
    this.initialized.next(true);
  }

  buildOperation(): ITransactionOperation {
    if (typeof this.options.operation === 'function') {
      throw new Error('Method not implemented.');
    }

    return new WizardTransactionOperation(this, this.options.operation);
  }

  isDirty(): boolean {
    const current = this.current.value;
    const previous = this.previous.value;

    if (!previous) {
      return false;
    }

    return diffState<Model>(previous as Model, current).length !== 0;
  }

  resolveChanges(): UpdateWizardState[] {
    const current = this.current.value;
    const previous = this.previous.value;

    return diffState(previous as Model, current);
  }

  createPatchModel(): Partial<Model> {
    const partial: Partial<Model> = {};
    const changes = this.resolveChanges();
    changes.forEach((change) => {
      partial[change.property as keyof Model] = change.value;
    });

    return partial;
  }
}

class WizardTransactionOperation<Model extends object> implements ITransactionOperation {
  constructor(private readonly step: WizardStep<Model>, private readonly inner: IWizardOperation<Model>) {}

  async commit(): Promise<void> {
    const current = this.step.model;
    const values = this.step.createPatchModel();
    const changes = await firstValueFrom(this.step.changes$);
    await this.inner.execute(values, changes, current);
  }

  async rollback(): Promise<void> {
    this.step.rollbackToPrevious();
  }
}

// Wizards are configured similarly to a data cache because they have their own state management
export class Wizard<State, Params> {
  constructor(private readonly steps: IWizardStep<Params>[]) {}

  async start(params: Params): Promise<void> {
    await Promise.all(this.steps.map((step) => step.resetState(params)));
  }

  findStep(key: keyof State): IWizardStep<Params> | undefined {
    return this.steps.find((x) => x.key === key);
  }

  get initialized$(): Observable<boolean> {
    return combineLatest(this.steps.map((x) => x.initialized$)).pipe(
      map((steps) => {
        return steps.every((x) => x);
      }),
    );
  }

  async save(): Promise<void> {
    await executeTransaction(...this.steps.map((x) => x.buildOperation()));
  }
}

// We need a simple function for diffing objects
export function diffState<T extends object>(a: T, b: T): UpdateWizardState[] {
  const changes: UpdateWizardState[] = [];
  const leftKeys = Object.keys(a);

  leftKeys.forEach((x) => {
    const current = a ? a[x as keyof T] : undefined;
    const next = b ? b[x as keyof T] : undefined;

    if (current === next) {
      return;
    }

    changes.push({
      property: x,
      value: next,
      previous: current,
    });
  });

  return changes;
}

declare type CreateWizardExpression<State, Params> = {
  [Property in keyof State]: WizardStepOptions<State[Property], Params>;
} & { onStart?: (params: Params) => Promise<void> };

export function createWizard<State, Params>(expression: CreateWizardExpression<State, Params>): Wizard<State, Params> {
  const steps = Object.entries(expression)
    .filter(([, val]) => typeof val !== 'function')
    .map(([, val]) => {
      return new WizardStep<object, Params>(val as unknown as WizardStepOptions<object, Params>);
    });

  return new Wizard<State, Params>(steps);
}
