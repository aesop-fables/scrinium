/* eslint-disable @typescript-eslint/no-explicit-any */
import { DataCache } from './DataCache';
import { DataStoreToken } from './DataStoreToken';
import { ICompartmentStorage } from './ICompartmentStorage';
import { Repository } from './Repository';

// Essentially an in-memory database
// First pass is JUST a replacement for AppStorage
// Then we'll layer in the schema and triggers
export class DataStore {
  constructor(private readonly values: Map<DataStoreToken, ICompartmentStorage>) {}

  public cache<Compartments>(token: DataStoreToken): DataCache<Compartments> {
    return this.values.get(token) as DataCache<Compartments>;
  }

  public repository<Registry>(token: DataStoreToken): Repository<Registry> {
    return this.values.get(token) as Repository<Registry>;
  }
}
