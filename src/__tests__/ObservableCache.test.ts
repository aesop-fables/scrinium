import { firstValueFrom } from 'rxjs';
import { ObservableCache } from '../ObservableCache';
import { waitUntil } from './utils';

type SampleDto = {
  id: string;
  name: string;
};

describe('ObservableCache', () => {
  test('Example', async () => {
    const cache = new ObservableCache<string, SampleDto | undefined>({
      source: (key) => Promise.resolve({ id: key, name: `Sample ${key}` }),
      defaultValue: undefined,
    });

    const compartment = cache.get('1');

    await waitUntil(async () => await firstValueFrom(compartment.initialized$));
    const value = await firstValueFrom(compartment.value$);

    expect(value).toBeDefined();
    expect(value?.id).toBe('1');
    expect(value?.name).toBe('Sample 1');
  });
});
