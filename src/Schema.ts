import { AppStorageToken, DataCompartmentToken, ScriniumToken } from './AppStorageToken';
import { IDataTrigger, InvalidateDataTrigger } from './IDataTrigger';

export class SchemaTokenExpression {
  constructor(private readonly triggers: IDataTrigger[]) {}

  invalidatesCompartment(token: DataCompartmentToken): SchemaTokenExpression {
    return this.addTrigger(new InvalidateDataTrigger([token]));
  }

  // invalidates(...tokens: ScriniumToken[]): SchemaTokenExpression {
  //   return this.addTrigger(new InvalidateDataTrigger(tokens));
  // }

  addTrigger(trigger: IDataTrigger): SchemaTokenExpression {
    this.triggers.push(trigger);
    return this;
  }
}

export class Schema {
  constructor(private readonly values: Map<ScriniumToken, IDataTrigger[]>) {}

  // unit test this
  triggersFor(token: ScriniumToken): IDataTrigger[] {
    return this.values.get(token) ?? [];
  }

  toJSON() {
    return { ...this.values };
  }
}

export class SchemaExpression {
  constructor(private readonly values: Map<DataCompartmentToken, IDataTrigger[]>) {}

  compartment<Compartments>(token: AppStorageToken, key: keyof Compartments): SchemaTokenExpression {
    const compartmentToken = token.append(key as string);
    const triggers = this.triggersFor(compartmentToken);
    return new SchemaTokenExpression(triggers);
  }

  source(token: DataCompartmentToken): SchemaTokenExpression {
    const triggers = this.triggersFor(token);
    return new SchemaTokenExpression(triggers);
  }

  private triggersFor(token: DataCompartmentToken): IDataTrigger[] {
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
  const values: Map<DataCompartmentToken, IDataTrigger[]> = new Map();
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
