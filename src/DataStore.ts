/* eslint-disable @typescript-eslint/no-explicit-any */
import { Subscription } from 'rxjs';
import { Schema } from './Schema';
import { ScriniumToken } from './AppStorageToken';
import { DataCache } from './DataCache';
import { Repository } from './Repository';
import { DependencyGraph } from './DependencyGraph';

// Essentially an in-memory database
export class DataStore {
  private readonly values: Map<ScriniumToken, any> = new Map();
  private schema?: Schema;
  private readonly subscriptions: Subscription[] = [];
  private readonly graph: DependencyGraph = new DependencyGraph();

  // adding a value to the store should re-calculate all subscriptions

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

  public store(value: DataCache<any> | Repository<any>) {
    this.values.set(value.token, value);
    this.generateSubscriptions();
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
