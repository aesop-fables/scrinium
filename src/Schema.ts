import { DataStoreToken } from './DataStoreToken';
import { IDataTrigger, InvalidateDataTrigger } from './IDataTrigger';

export class SchemaTokenExpression {
  constructor(private readonly triggers: IDataTrigger[]) {}

  invalidatesCompartment(token: DataStoreToken): SchemaTokenExpression {
    return this.addTrigger(new InvalidateDataTrigger([token]));
  }

  addTrigger(trigger: IDataTrigger): SchemaTokenExpression {
    this.triggers.push(trigger);
    return this;
  }
}

export class Schema {
  constructor(private readonly values: Map<DataStoreToken, IDataTrigger[]>) {}

  // unit test this
  triggersFor(token: DataStoreToken): IDataTrigger[] {
    return this.values.get(token) ?? [];
  }

  toJSON() {
    return { ...this.values };
  }
}

export class SchemaExpression {
  constructor(private readonly values: Map<DataStoreToken, IDataTrigger[]>) {}

  compartment<Compartments>(token: DataStoreToken, key: keyof Compartments): SchemaTokenExpression {
    const compartmentToken = token.compartment<Compartments>(key);
    const triggers = this.triggersFor(compartmentToken);
    return new SchemaTokenExpression(triggers);
  }

  source(token: DataStoreToken): SchemaTokenExpression {
    const triggers = this.triggersFor(token);
    return new SchemaTokenExpression(triggers);
  }

  private triggersFor(token: DataStoreToken): IDataTrigger[] {
    let triggers = this.values.get(token);
    if (!triggers) {
      triggers = [];
      this.values.set(token, triggers);
    }

    return triggers;
  }
}

// TODO -- Unit test this
export function createSchema(configure: (schema: SchemaExpression) => void) {
  const values: Map<DataStoreToken, IDataTrigger[]> = new Map();
  const expression = new SchemaExpression(values);
  configure(expression);

  return new Schema(values);
}
