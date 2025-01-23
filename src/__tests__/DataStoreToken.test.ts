import { DataStoreToken } from '../DataStoreToken';

describe('DataStoreToken', () => {
  test('Basic equality check', () => {
    const token1 = new DataStoreToken('token1');
    const token2 = new DataStoreToken('token1');

    expect(token1.equals(token2)).toBeTruthy();
  });

  test('Basic inequality check', () => {
    const token1 = new DataStoreToken('token1');
    const token2 = new DataStoreToken('token2');

    expect(token1.equals(token2)).toBeFalsy();
  });

  test('appends the compartment', () => {
    const baseToken = new DataStoreToken('data');
    const compartmentToken = baseToken.compartment<TestCompartments>('foo');

    expect(compartmentToken.value).toBe('data/foo');

    expect(compartmentToken.equals(new DataStoreToken('data/foo'))).toBeTruthy();
  });

  test('is child of', () => {
    const baseToken = new DataStoreToken('data');
    const compartmentToken = baseToken.compartment<TestCompartments>('foo');

    expect(compartmentToken.isChildOf(baseToken)).toBeTruthy();
  });

  test('is not child of', () => {
    const baseToken = new DataStoreToken('data');
    const compartmentToken = new DataStoreToken('data-store/test');

    expect(compartmentToken.isChildOf(baseToken)).toBeFalsy();
  });

  test('is parent of', () => {
    const baseToken = new DataStoreToken('data');
    const compartmentToken = baseToken.compartment<TestCompartments>('foo');

    expect(baseToken.isParentOf(compartmentToken)).toBeTruthy();
  });

  test('is not parent of', () => {
    const baseToken = new DataStoreToken('data');
    const compartmentToken = new DataStoreToken('data-store/test');

    expect(baseToken.isChildOf(compartmentToken)).toBeFalsy();
  });

  type TestCompartments = {
    foo: string;
    bar: string;
  };
});
