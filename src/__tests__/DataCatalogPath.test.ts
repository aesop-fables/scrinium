import { ChangeRecord, DataCompartmentOptions } from '../Compartments';
import { ConfiguredDataSource } from '../ConfiguredDataSource';
import { createDataCache } from '../DataCache';
import { DataCatalog } from '../DataCatalog';
import { DataCatalogPath } from '../DataCatalogPath';
import { DataStoreToken } from '../DataStoreToken';

interface UserDto {
  userId: number;
}

const userToken = new DataStoreToken('users');

interface UserCompartments {
  account: DataCompartmentOptions<UserDto | undefined>;
}

describe('DataCatalogPath', () => {
  test('subscribes to the cache', async () => {
    const cache = createDataCache<UserCompartments>(userToken, {
      account: {
        loadingOptions: {
          strategy: 'manual',
        },
        defaultValue: undefined,
        source: new ConfiguredDataSource(async () => {
          return {
            userId: 100,
          };
        }),
      },
    });

    const catalog = new DataCatalog();
    catalog.registerCache(cache);

    let changeRecord: ChangeRecord<UserDto | undefined> | undefined;
    const path = DataCatalogPath.fromCacheCompartment(userToken.compartment('account'));
    path.addEventListener(catalog, 'change', ({ details: record }) => {
      changeRecord = record as ChangeRecord<UserDto | undefined>;
    });

    await cache.reload('account');

    expect(changeRecord).toBeDefined();
    expect(changeRecord?.previous).toBeUndefined();
    expect(changeRecord?.current).toEqual({ userId: 100 });
  });
});
