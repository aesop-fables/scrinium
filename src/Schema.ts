import { DataStoreToken } from './DataStoreToken';
import { IDataTrigger, InvalidateDataTrigger, ResetDataTrigger } from './IDataTrigger';

export class SchemaTokenExpression {
  constructor(private readonly triggers: IDataTrigger[]) {}

  invalidatesCompartment(token: DataStoreToken): SchemaTokenExpression {
    return this.addTrigger(new InvalidateDataTrigger([token]));
  }

  resetsCompartment(token: DataStoreToken): SchemaTokenExpression {
    return this.addTrigger(new ResetDataTrigger([token]));
  }

  addTrigger(trigger: IDataTrigger): SchemaTokenExpression {
    this.triggers.push(trigger);
    return this;
  }
}

export class Schema {
  constructor(private readonly values: Record<string, IDataTrigger[]>) {}

  get observableTokens(): DataStoreToken[] {
    return Object.keys(this.values).map((x) => new DataStoreToken(x));
  }

  triggersFor(token: DataStoreToken): IDataTrigger[] {
    return this.values[token.value] ?? [];
  }

  toJSON() {
    return { ...this.values };
  }
}

export class SchemaBuilder {
  constructor(private readonly values: Record<string, IDataTrigger[]>) {}

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
    let triggers = this.values[token.value];
    if (!triggers) {
      triggers = [];
      this.values[token.value] = triggers;
    }

    return triggers;
  }
}

export function createSchema(configure: (schema: SchemaBuilder) => void) {
  const values: Record<string, IDataTrigger[]> = {};
  const expression = new SchemaBuilder(values);
  configure(expression);

  return new Schema(values);
}
