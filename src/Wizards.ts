// I think the wizard step is basically a self-contained piece of state management for a given "screen"

import { Newable } from '.';
import { ITransactionOperation } from './Transactions';
import { BehaviorSubject, combineLatest, firstValueFrom, Observable, map } from 'rxjs';

export interface IWizardStepSource<T> {
  load(): Promise<T>;
}

export class WizardStepSource<T> implements IWizardStepSource<T> {
  constructor(private readonly inner: () => Promise<T>) {}

  load(): Promise<T> {
    return this.inner();
  }
}

export interface UpdateWizardState {
  property: string;
  value: any;
  previous: any;
}

export interface IWizardStep {
  // Resets the state of the step which effectively does two things: 1. It sets the value of the underlying observable to the defaultValue defined for the step 2. It calls load() on the configured IWizardStepSource
  resetState(): Promise<void>;
  buildOperation(): ITransactionOperation;
  isDirty(): boolean;
  changes$: Observable<UpdateWizardState[]>;
}

export interface WizardStepOptions<Model extends object> {
  source: IWizardStepSource<Model>;
  defaultValue: Model;
  operation: Newable<IWizardOperation<Model>> | IWizardOperation<Model>;
}

export interface IWizardOperation<Model extends object> {
  execute(values: Partial<Model>, changes: UpdateWizardState[], current: Model): Promise<void>;
}

export class WizardStep<Model extends object> implements IWizardStep {
  private readonly current: BehaviorSubject<Model>;
  private readonly previous: BehaviorSubject<Model | undefined> = new BehaviorSubject<Model | undefined>(undefined);

  constructor(private readonly options: WizardStepOptions<Model>) {
    this.current = new BehaviorSubject<Model>(this.options.defaultValue);
  }

  get changes$(): Observable<UpdateWizardState[]> {
    return combineLatest([this.current, this.previous]).pipe(
      map(([current, previous]) => diffState(previous as Model, current)),
    );
  }

  get model(): Model {
    return this.current.value;
  }

  get previousModel(): Model | undefined {
    return this.previous.value;
  }

  save(value: Model): void {
    this.previous.next(this.current.value);
    this.current.next(value);
  }

  async resetState(): Promise<void> {
    const value = await this.options.source.load();
    this.current.next(value);
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
    const previous = this.step.previousModel as Model;
    await this.inner.execute(previous, [], previous);
  }
}

// Wizards are configured similarly to a data cache because they have their own state management
export class Wizard {
  constructor(private readonly steps: IWizardStep[]) {}

  async initialize(): Promise<void> {
    await Promise.all(this.steps.map((step) => step.resetState()));
  }

  // get initialized$(): Observable<boolean>
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
