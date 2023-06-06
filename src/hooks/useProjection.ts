/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/ban-types */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useAppStorage } from '../useAppStorage';
import { Newable } from '@aesop-fables/containr';
import { useServiceContainer } from '@aesop-fables/containr-react';
import useConstant from './useConstant';
import { DataCompartment } from '../Compartments';
import { map, Observable } from 'rxjs';
import { IProjectionFactory, ProjectionConstructor, ProjectionContext, createProjection } from '../Projections';

export function useProjection<Projection>(
  constructor: ProjectionConstructor<Projection> | IProjectionFactory<Projection> | Newable<Projection>,
): Projection {
  const storage = useAppStorage();
  const container = useServiceContainer();
  return useConstant(() => createProjection(storage, container, constructor));
}

export class DataCompartmentProjection<Value> {
  constructor(private readonly compartment: DataCompartment<Value>) {}

  get loading$(): Observable<boolean> {
    return this.compartment.initialized$().pipe(map((x) => !x));
  }

  get value$(): Observable<Value> {
    return this.compartment.value$;
  }
}

export class DataCompartmentProjectionFactory<Value> implements IProjectionFactory<DataCompartmentProjection<Value>> {
  constructor(
    private readonly storageKey: string,
    private readonly key: string,
    private readonly id: string | number,
  ) {}

  create(context: ProjectionContext): DataCompartmentProjection<Value> {
    const { storage } = context;
    const repository = storage.repository<any>(this.storageKey);
    const compartment = repository.get<string | number, Value>(this.key, this.id);
    return new DataCompartmentProjection<Value>(compartment);
  }
}

export function useRepositoryProjection<Registry, Value>(
  storageKey: string,
  key: keyof Registry,
  id: string | number,
): DataCompartmentProjection<Value> {
  return useProjection(new DataCompartmentProjectionFactory<Value>(storageKey, key as string, id));
}
