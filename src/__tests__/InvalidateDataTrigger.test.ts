import { ApplicationCacheManager } from '../Caching';
import { ChangeRecord } from '../Compartments';
import { DataCatalog } from '../DataCatalog';
import { createEventEnvelope } from '../DataCompartment';
import { DataStore } from '../DataStore';
import { DataStoreToken } from '../DataStoreToken';
import { InvalidateDataTrigger, TriggerContext } from '../IDataTrigger';
import { systemClock } from '../System';

describe('InvalidateDataTrigger', () => {
  test('invalidates each token', async () => {
    const cache = new ApplicationCacheManager();
    const envelope = createEventEnvelope('change', {} as ChangeRecord);
    const store = new DataStore(new DataCatalog());
    const context = new TriggerContext(cache, envelope, store, systemClock);

    const t1 = new DataStoreToken('t1');
    const t2 = new DataStoreToken('t2');
    const t3 = new DataStoreToken('t3');

    const trigger = new InvalidateDataTrigger([t1, t2, t3]);
    trigger.onCompartmentEventRaised(context);

    expect(cache.find(t1.value)?.isExpired(systemClock)).toBe(true);
    expect(cache.find(t2.value)?.isExpired(systemClock)).toBe(true);
    expect(cache.find(t3.value)?.isExpired(systemClock)).toBe(true);
  });
});
