import { firstValueFrom } from 'rxjs';
import { AppData } from '../AppData';
import { DataCategory, DataCompartmentOptions } from '../Compartments';
import { wait } from './utils';
import { createTypedCacheScenario } from '../Utils';

interface Video {
  id: string;
  name: string;
}

interface TestStoreCompartments {
  videos: DataCompartmentOptions<Video>;
}

describe('TypedCache', () => {
  test('Compartments > load > equality > happy path', async () => {
    const video1: Video = {
      id: '123',
      name: 'Test Video 1',
    };

    const { createProxy } = createTypedCacheScenario<TestStoreCompartments>({
      a: {
        load: async () => a,
        defaultValue: [],
        category: DataCategory.NonCritical,
      },
      b: {
        load: async () => b,
        defaultValue: [],
        category: DataCategory.NonCritical,
      },
    });

    const observedA = await createProxy<ResponseA>('a');
    expect(observedA).toStrictEqual(a);

    const observedB = await createProxy<ResponseB>('b');
    expect(observedB).toStrictEqual(b);
  });
});

