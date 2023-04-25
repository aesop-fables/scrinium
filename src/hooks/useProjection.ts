/* eslint-disable @typescript-eslint/ban-types */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { IAppStorage } from '../AppStorage';
import { useAppStorage } from '../useAppStorage';
import { getDependencyMetadata, IServiceContainer } from '@aesop-fables/containr';
import { useServiceContainer } from '@aesop-fables/containr-react';
import useConstant from './useConstant';
import { DataCompartment } from '../Compartments';
import { map, Observable } from 'rxjs';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Newable<T> = new (...args: any[]) => T;

const fromAppStorageMetadataKey = Symbol('@3nickels/data-projections/projections/fromAppStorage');

declare type ParamStrategy = 'container' | 'projection' | 'storage';

declare type OrderableParameter = { parameterIndex: number };

interface ProjectionParamMetadata extends OrderableParameter {
  strategy: ParamStrategy;
  key?: string;
  target?: Object;
}

export function fromAppStorage(storageKey: string) {
  return (target: Object, propertyKey: string | symbol | undefined, parameterIndex: number): void => {
    const metadata =
      (Reflect.getMetadata(fromAppStorageMetadataKey, target) as ProjectionParamMetadata[] | undefined) ?? [];
    metadata.push({ parameterIndex, strategy: 'storage', key: storageKey });
    Reflect.defineMetadata(fromAppStorageMetadataKey, metadata, target);
  };
}

export function fromProjection<Projection>(
  constructor: ProjectionConstructor<Projection> | IProjectionFactory<Projection> | Newable<Projection>,
) {
  return (target: Object, propertyKey: string | symbol | undefined, parameterIndex: number): void => {
    const metadata =
      (Reflect.getMetadata(fromAppStorageMetadataKey, target) as ProjectionParamMetadata[] | undefined) ?? [];
    metadata.push({ parameterIndex, strategy: 'projection', target: constructor });
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

function findStorageArgs(target: Object): ProjectionParamMetadata[] {
  return (Reflect.getMetadata(fromAppStorageMetadataKey, target) as ProjectionParamMetadata[]) ?? [];
}

function findInjectArgs(target: Object): ProjectionParamMetadata[] {
  return getDependencyMetadata(target).map((dependency) => ({
    strategy: 'container',
    key: dependency.dependencyKey,
    parameterIndex: dependency.parameterIndex,
  }));
}

export function gatherConstructorArgs(target: Object) {
  return [...findStorageArgs(target), ...findInjectArgs(target)].sort((a, b) => a.parameterIndex - b.parameterIndex);
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

  const metadata = gatherConstructorArgs(constructor);
  if (!metadata || metadata.length === 0) {
    return new (constructor as ProjectionConstructor<Projection>)(context, ...args);
  }

  const params = [
    ...args,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ...metadata.map((data) => {
      if (!data.key && (data.strategy === 'storage' || data.strategy === 'container')) {
        throw new Error(`Cannot create projection. Key at index ${data.parameterIndex}`);
      }

      if (data.strategy === 'storage') {
        return storage.retrieve<any>(data.key ?? '');
      }

      if (data.strategy === 'container') {
        return container.get<any>(data.key ?? '');
      }

      if (data.strategy === 'projection') {
        if (!data.target) {
          throw new Error(`Cannot create projection. No projection specified at index ${data.parameterIndex}`);
        }

        return createProjection(storage, container, data.target as ProjectionConstructor<any>);
      }

      throw new Error(`Invalid strategy: ${data.strategy} at index ${data.parameterIndex}`);
    }),
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
