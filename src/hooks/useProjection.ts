import 'reflect-metadata';
import { IAppStorage, useAppStorage } from '../AppStorage';
import { IServiceContainer } from '@aesop-fables/containr';
import { useServiceContainer } from '@aesop-fables/containr-react';
import useConstant from './useConstant';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Newable<T> = new (...args: any[]) => T;

const connectCacheMetadataKey = Symbol('@3nickels/data-projections/projections/connectCache');

export function connectCache(storageKey: string) {
  // eslint-disable-next-line @typescript-eslint/ban-types, @typescript-eslint/no-unused-vars
  return (target: Object, propertyKey: string | symbol, parameterIndex: number): void => {
    const metadata = (Reflect.getMetadata(connectCacheMetadataKey, target) as string[] | undefined) ?? [];
    metadata.push(storageKey);
    Reflect.defineMetadata(connectCacheMetadataKey, metadata, target);
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

  const metadata = Reflect.getMetadata(connectCacheMetadataKey, constructor) as string[] | undefined;
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
