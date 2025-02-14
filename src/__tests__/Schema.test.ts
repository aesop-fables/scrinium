import { DataStoreToken } from '../DataStoreToken';
import { ResetDataTrigger } from '../IDataTrigger';
import { createSchema } from '../Schema';

describe('createSchema', () => {
  test('indexes the triggers by token', async () => {
    const token1 = new DataStoreToken('token1');
    const token2 = new DataStoreToken('token2');

    const schema = createSchema((schema) => {
      schema.source(token1).addTrigger(new ResetDataTrigger([token2]));
    });

    expect(schema.triggersFor(token1)).toHaveLength(1);
    expect(schema.triggersFor(token2)).toHaveLength(0);

    expect(schema.triggersFor(token1)[0].tokens[0]).toBe(token2);
  });
});
