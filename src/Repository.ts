/* eslint-disable @typescript-eslint/no-explicit-any */
import { DataCompartment, IDataCompartment, RefreshOptions, TimeoutOptions } from './Compartments';

export declare type IndexedCompartments<T> = Record<keyof T, IDataCompartment>;

/**
 * Represents a data source used to resolve an entity by key.
 */
export interface IEntityResolver<Entity, Key> {
  /**
   * An idempotent function used to load the entity.
   */
  resolve: (key: Key) => Promise<Entity>;
}
/**
 * Provides strongly-typed configuration options for an individual entity compartment.
 */
interface IRepositoryCompartmentOptions {
  /**
   * Optional configuration for controlling how frequently the entity is reloaded.
   * If no configuration is provided, the entity will be retained in-memory until it is manually updated.
   */
  retention?: RefreshOptions | TimeoutOptions;
}

/**
 * Provides strongly-typed configuration options for an individual entity compartment.
 */
export interface RepositoryCompartmentOptions<Entity, Key> extends IRepositoryCompartmentOptions {
  /**
   * The data source used to fill a compartment.
   */
  resolver: IEntityResolver<Entity, Key>;
}
/**
 * Represents a set of entity compartments.
 */
export interface IRepository<Registry> {
  /**
   * Gets a data compartment that is configured to retrieve the specific entity.
   * @param key The key of the compartment to retrieve.
   * @param id The id of the entity to retrieve.
   */
  get<Response, Key>(key: keyof Registry, id: Key): DataCompartment<Response>;
}
/**
 * Creates a repository to hold compartments for each item in the specified registry.
 * @param registry The registry used to configure the various entity options
 */
export function createRepository<Registry extends Record<string, any>>(registry: Registry): IRepository<Registry> {
  // Let's introduce the ILocker interface
  throw new Error('BLAAAAAH');
}

interface Video {
  id: string;
}

interface SampleCompartments {
  video: RepositoryCompartmentOptions<Video, string>;
}

const repository = createRepository<SampleCompartments>({
  video: {
    resolver: blah,
    retention: { reloadInterval: 50 },
  },
});

const dataCompartment = repository.get<Video>('video', '1');
// ^^ And now we're back to data compartments
