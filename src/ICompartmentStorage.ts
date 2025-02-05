import { DataStoreToken } from './DataStoreToken';

export interface ICompartmentStorage {
  /**
   * Provides access to the compartments managed by the storage.
   */
  managedTokens: DataStoreToken[];
}
