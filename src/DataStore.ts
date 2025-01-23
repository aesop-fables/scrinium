/* eslint-disable @typescript-eslint/no-explicit-any */
import { Subscription } from 'rxjs';
import { Schema } from './Schema';
import { ScriniumToken } from './AppStorageToken';
import { DataCache } from './DataCache';
import { Repository } from './Repository';
import { DependencyGraph } from './DependencyGraph';

// Essentially an in-memory database
export class DataStore {
  private schema?: Schema;
  private readonly subscriptions: Subscription[] = [];
  private readonly graph: DependencyGraph = new DependencyGraph();

  constructor(private readonly values: Map<ScriniumToken, any>) {}

  private generateSubscriptions() {
    // no-op for now
    for (const subscription of this.subscriptions) {
      subscription.unsubscribe();
    }

    this.subscriptions.length = 0;
    this.graph.clear();

    // Populate the graph
    // Generate subscriptions
  }
  public cache<Compartments>(token: ScriniumToken): DataCache<Compartments> {
    return this.values.get(token) as DataCache<Compartments>;
  }

  public repository<Registry>(token: ScriniumToken): Repository<Registry> {
    return this.values.get(token) as Repository<Registry>;
  }

  public apply(schema: Schema) {
    // no-op for now
    this.schema = schema;
    this.generateSubscriptions();
  }
}

// Feels like the subscription is really just going to do something like...
// createCompartmentChangedHandler(token: DataCompartmentToken, schema);

// AppStorageToken is really just a path that points to a cache/repository/compartment within the DataStore

// Ok, come back around in a clean branch and...
// 1. Replace AppStorage with DataStore (AppStorage -> DataStoreBuilder)
//     Also update the various AppStorage moniker usages like AppStorageRegistration...
// 2. Replace AppStorageToken with DataStoreToken (AppStorageToken -> DataStoreToken)
// 3. Replace DataCompartmentToken with DataStoreToken (DataCompartmentToken -> DataStoreToken)
// 4. Introduce the ability to retrieve a compartment from the data store given a token (unit test!)