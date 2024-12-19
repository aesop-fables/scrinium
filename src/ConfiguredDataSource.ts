import { IDataCompartmentSource } from './IDataCompartmentSource';

/**
 * Adapts a function to the IDataCompartmentSource<T> interface.
 */

export class ConfiguredDataSource<T> implements IDataCompartmentSource<T> {
  /**
   * Constructs a new configured data source.
   * @param provider The function to invoke to resolve the data for the compartment.
   */
  constructor(private readonly provider: () => Promise<T>) { }
  /**
   * Loads the data for a compartment from the provider.
   */
  load(): Promise<T> {
    return this.provider();
  }
}
