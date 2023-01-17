/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  ConfiguredDataSource,
  DataCompartment,
  DataCompartmentOptions,
  RefreshOptions,
  TimeoutOptions,
} from './Compartments';
import { ConsoleLogger } from './Logging';
import { Hash, ILookup, Lookup } from './Lookup';
/**
 * Represents a data source used to resolve an entity by key.
 */
export interface IEntityResolver<Key, Entity> {
  /**
   * An idempotent function used to load the entity.
   * @param key The key of the entity to load
   */
  resolve: (key: Key) => Promise<Entity>;
}
/**
 * Adapts a function to the IEntityResolver<Key, Entity> interface.
 */
export class ConfiguredEntityResolver<Key, Entity> implements IEntityResolver<Key, Entity> {
  constructor(private readonly resolver: (key: Key) => Promise<Entity>) {}
  /**
   * An idempotent function used to load the entity.
   * @param key The key of the entity to load
   */
  resolve(key: Key): Promise<Entity> {
    return this.resolver(key);
  }
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
export interface RepositoryCompartmentOptions<Key, Entity> extends IRepositoryCompartmentOptions {
  /**
   * The data source used to fill a compartment.
   */
  resolver: IEntityResolver<Key, Entity>;
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
  get<Key extends string | number, Response>(key: keyof Registry, id: Key): DataCompartment<Response>;
}
/**
 * Represents a set of entity compartments.
 */
export class Repository<Registry> implements IRepository<Registry> {
  private readonly compartments: Hash<ILookup<string | number, DataCompartment<unknown>>>;
  constructor(lookups: { [key: string | number]: ILookup<string | number, DataCompartment<unknown>> }) {
    this.compartments = {};

    const entries = Object.entries(lookups);
    entries.forEach(([key, value]) => {
      this.compartments[key] = value;
    });
  }
  /**
   * Gets a data compartment that is configured to retrieve the specific entity.
   * @param key The key of the compartment to retrieve.
   * @param id The id of the entity to retrieve.
   */
  get<Key extends string | number, Response>(key: keyof Registry, id: Key): DataCompartment<Response> {
    const lookup = this.compartments[key as string] as ILookup<string | number, DataCompartment<Response>>;
    if (!lookup) {
      throw new Error(`Could not find compartment "${String(key)}".`);
    }
    return lookup.find(id as string | number);
  }
}
/**
 * Creates a repository to hold compartments for each item in the specified registry.
 * @param registry The registry used to configure the various entity options
 * @example
 * ```ts
 * import { RepositoryCompartmentOptions } from '@aesop-fables/scrinium';
 *
 * // In this example, we'll be looking up videos by id
 * interface Video {
 *  id: string;
 *  title: string;
 *  url: string;
 * }
 *
 * // Now we define the interface that's used to configure each entity
 * interface VideoRegistry {
 *   videos: RepositoryCompartmentOptions<string, Video>;
 * }
 *
 * const repository = createRepository<VideoRegistry>({
 *  videos: {
 *    resolver: new ConfiguredEntityResolver<string, Video>((id) => axios.get(`/videos/${id}`)),
 *  },
 * });
 *
 * // This returns a `DataCompartment`.
 * const videoCompartment = repository.get<string, Video>('videos', '1');
 * ```
 */
export function createRepository<Registry extends Record<string, any>>(registry: Registry): IRepository<Registry> {
  const entries = Object.entries(registry);
  const lookups: { [key: string | number]: ILookup<string | number, DataCompartment<unknown>> } = {};
  entries.forEach(([key, value]) => {
    lookups[key] = new Lookup<string | number, DataCompartment<unknown>>((id) => {
      const entityOptions = value as RepositoryCompartmentOptions<string | number, unknown | undefined>;
      const options: DataCompartmentOptions<unknown | undefined> = {
        autoLoad: true,
        retention: entityOptions.retention,
        defaultValue: undefined,
        source: new ConfiguredDataSource(async () => entityOptions.resolver.resolve(id)),
      };

      return new DataCompartment<unknown>(key, options, new ConsoleLogger());
    });
  });

  return new Repository(lookups);
}
