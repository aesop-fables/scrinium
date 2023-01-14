/* eslint-disable @typescript-eslint/no-explicit-any */
import { DataCompartment, DataCompartmentOptions, IDataCompartment } from './Compartments';

export declare type IndexedCompartments<T> = Record<keyof T, IDataCompartment>;

export interface ITypedCache<Compartments> {
  get<Model, Key>(compartment: keyof Compartments): DataCompartment<Model, DataCompartmentOptions<Model, Key>>;
}

export class TypedCache<Compartments> implements ITypedCache<Compartments> {
  constructor(private readonly compartments: IndexedCompartments<Compartments>) {}

  get<Model, Key>(compartment: keyof Compartments): DataCompartment<Model, DataCompartmentOptions<Model, Key>> {
    // TODO -- Implement the caching strategies
    return this.compartments[compartment] as DataCompartment<Model, DataCompartmentOptions<Model, Key>>;
  }
}

export function createTypedCached<Compartments extends Record<string, any>>(
  policy: Compartments,
): ITypedCache<Compartments> {
  const entries = Object.entries(policy);
  const index: Record<string, any> = {};
  entries.forEach(([key, value]) => {
    index[key] = new DataCompartment<unknown, DataCompartmentOptions<unknown>>(
      key,
      value as DataCompartmentOptions<unknown>,
    );
  });

  return new TypedCache<Compartments>(index as unknown as IndexedCompartments<Compartments>);
}
