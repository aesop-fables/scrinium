import { ConfiguredEntityResolver } from '../Repository';

describe('ConfiguredEntityResolver', () => {
  test('constructs data source without invoking provider', async () => {
    let invoked = false;
    const resolver = new ConfiguredEntityResolver<string, boolean>(async (id) => (invoked = id === '123'));
    const result = await resolver.resolve('123');
    expect(invoked).toBeTruthy();
    expect(result).toBeTruthy();
  });
});
