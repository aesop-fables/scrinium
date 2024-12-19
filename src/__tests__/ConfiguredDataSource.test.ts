import { ConfiguredDataSource } from '../ConfiguredDataSource';

describe('ConfiguredDataSource', () => {
  test('constructs data source without invoking provider', async () => {
    let invoked = false;
    new ConfiguredDataSource(async () => (invoked = true));

    expect(invoked).toBeFalsy();
  });

  test('loads data from the provider', async () => {
    const value = 'test test test test';
    const source = new ConfiguredDataSource(async () => value);
    const actual = await source.load();

    expect(actual).toBe(value);
  });
});
