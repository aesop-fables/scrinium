/* eslint-disable @typescript-eslint/no-explicit-any */
import 'reflect-metadata';
import { IAppStorage } from '../AppStorage';
import { useAppStorage } from '../useAppStorage';
import { IServiceContainer } from '@aesop-fables/containr';
import { useServiceContainer } from '@aesop-fables/containr-react';
import useConstant from './useConstant';
import { DataCompartment } from '../Compartments';
import { map, Observable } from 'rxjs';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Newable<T> = new (...args: any[]) => T;

const fromAppStorageMetadataKey = Symbol('@3nickels/data-projections/projections/fromAppStorage');

export function fromAppStorage(storageKey: string) {
  // eslint-disable-next-line @typescript-eslint/ban-types, @typescript-eslint/no-unused-vars
  return (target: Object, propertyKey: string | symbol, parameterIndex: number): void => {
    const metadata = (Reflect.getMetadata(fromAppStorageMetadataKey, target) as string[] | undefined) ?? [];
    metadata.push(storageKey);
    Reflect.defineMetadata(fromAppStorageMetadataKey, metadata, target);
  };
}

export interface ProjectionContext {
  storage: IAppStorage;
  container: IServiceContainer;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type ProjectionConstructor<T> = new (context: ProjectionContext, ...args: any[]) => T;

export interface IProjectionFactory<T> {
  create(context: ProjectionContext): T;
}

export function createProjection<Projection>(
  storage: IAppStorage,
  container: IServiceContainer,
  constructor: ProjectionConstructor<Projection> | IProjectionFactory<Projection> | Newable<Projection>,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ...args: any[]
): Projection {
  const context: ProjectionContext = { storage, container };

  if ((constructor as IProjectionFactory<Projection>)?.create) {
    const factory = constructor as IProjectionFactory<Projection>;
    return factory.create(context);
  }

  const metadata = Reflect.getMetadata(fromAppStorageMetadataKey, constructor) as string[] | undefined;
  if (!metadata || metadata.length === 0) {
    return new (constructor as ProjectionConstructor<Projection>)(context, ...args);
  }

  // These are coming in descending order
  const paramTypes: string[] = [...metadata];
  paramTypes.reverse();

  const params = [
    ...args,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ...paramTypes.map((storageKey: string) => storage.retrieve<any>(storageKey)),
  ];

  return new (constructor as Newable<Projection>)(...params);
}

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
