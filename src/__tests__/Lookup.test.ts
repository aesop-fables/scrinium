import { Lookup } from '../Lookup';

describe('Lookup', () => {
  test('resolves the value the first time', async () => {
    let invoked = 0;
    const lookup = new Lookup<string, string>((key: string) => {
      if (key === '123') {
        invoked++;
      }

      return key;
    });

    const value = lookup.find('123');
    expect(invoked).toBe(1);
    expect(value).toBe('123');
  });

  test('only resolves the value the first time', async () => {
    let invoked = 0;
    const lookup = new Lookup<string, string>((key: string) => {
      if (key === '123') {
        invoked++;
      }

      return key;
    });

    const value1 = lookup.find('123');
    const value2 = lookup.find('123');
    const value3 = lookup.find('123');

    expect(invoked).toBe(1);
    expect(value1).toBe('123');
    expect(value2).toBe('123');
    expect(value3).toBe('123');
  });

  test('injecting a value avoids the resolver', async () => {
    let invoked = 0;
    const lookup = new Lookup<string, string>((key: string) => {
      if (key === '123') {
        invoked++;
      }

      return key;
    });

    lookup.inject('123', 'foo');

    const value1 = lookup.find('123');
    const value2 = lookup.find('123');
    const value3 = lookup.find('123');

    expect(invoked).toBe(0);
    expect(value1).toBe('foo');
    expect(value2).toBe('foo');
    expect(value3).toBe('foo');
  });
});
