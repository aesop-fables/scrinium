import { AppStorageToken, DataCompartmentToken, ScriniumToken } from './AppStorageToken';
import { IDataTrigger, InvalidateDataTrigger } from './IDataTrigger';

export class CacheExpression {
  constructor(private readonly triggers: IDataTrigger[]) {}

  invalidates(...tokens: ScriniumToken[]): CacheExpression {
    return this.addTrigger(new InvalidateDataTrigger(tokens));
  }

  addTrigger(trigger: IDataTrigger): CacheExpression {
    this.triggers.push(trigger);
    return this;
  }
}

export class Schema {
  constructor(private readonly values: Map<ScriniumToken, IDataTrigger[]>) {}

  triggersFor(token: ScriniumToken): IDataTrigger[] {
    return this.values.get(token) ?? [];
  }

  toJSON() {
    return { ...this.values };
  }
}

export class SchemaExpression {
  constructor(private readonly values: Map<ScriniumToken, IDataTrigger[]>) {}

  cache(token: AppStorageToken): CacheExpression {
    const triggers = this.triggersFor(token);
    return new CacheExpression(triggers);
  }

  compartment(token: DataCompartmentToken): CacheExpression {
    const triggers = this.triggersFor(token);
    return new CacheExpression(triggers);
  }

  private triggersFor(token: ScriniumToken): IDataTrigger[] {
    let triggers = this.values.get(token);
    if (!triggers) {
      triggers = [];
      this.values.set(token, triggers);
    }

    return triggers;
  }
}

export function createSchema(configure: (schema: SchemaExpression) => void) {
  const values: Map<ScriniumToken, IDataTrigger[]> = new Map();
  const expression = new SchemaExpression(values);
  configure(expression);

  return new Schema(values);
}

// const mySchema = createSchema((schema) => {
//   const userToken = new AppStorageToken('user');
//   schema.cache(userToken).invalidates({
//     caches: [], // cache-level
//     compartments: [], // compartment-level
//   });

//   schema.compartment(userToken.append('info')).invalidates({
//     caches: [], // cache-level
//     compartments: [], // compartment-level
//   });
// });
