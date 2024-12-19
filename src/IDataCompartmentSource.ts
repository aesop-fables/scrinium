/**
 * Represents a data source used to fill a compartment.
 */

export interface IDataCompartmentSource<T> {
  /**
   * An idempotent function used to load the data for a compartment.
   */
  load(): Promise<T>;
}
