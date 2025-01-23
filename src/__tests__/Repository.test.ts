import 'reflect-metadata';
import { firstValueFrom } from 'rxjs';
import { ConfiguredEntityResolver, IRepository, createRepository } from '../Repository';
import { Video, VideoMetadata, VideoRegistry } from './Common';
import { wait } from './utils';
import { injectRepository } from '../Decorators';
import { createContainer } from '@aesop-fables/containr';
import { useScrinium } from '../bootstrapping';
import { IAppStorage } from '../AppStorage';
import { ScriniumServices } from '../ScriniumServices';
import { DataStoreToken } from '../DataStoreToken';

const repoToken = new DataStoreToken('videos');

describe('Repository', () => {
  test('resolves the value the first time', async () => {
    const videos: Video[] = [{ id: '1', title: 'Video 1' }];
    const metadata: VideoMetadata[] = [{ id: '1', duration: 1000 }];

    const repository = createRepository<VideoRegistry>(repoToken, {
      metadata: {
        resolver: new ConfiguredEntityResolver<string, VideoMetadata>(async (key) => {
          await wait(150);
          return metadata.find((x) => x.id === key) as VideoMetadata;
        }),
      },
      videos: {
        resolver: new ConfiguredEntityResolver<string, Video>(async (key) => {
          await wait(100);
          return videos.find((x) => x.id === key) as Video;
        }),
      },
    });

    const videoCompartment = repository.get<string, Video>('videos', '1');
    const metaCompartment = repository.get<string, VideoMetadata>('metadata', '1');

    expect(await firstValueFrom(videoCompartment.initialized$)).toBeFalsy();
    expect(await firstValueFrom(metaCompartment.initialized$)).toBeFalsy();

    await wait(200);

    expect(await firstValueFrom(videoCompartment.initialized$)).toBeTruthy();
    expect(await firstValueFrom(metaCompartment.initialized$)).toBeTruthy();

    expect(await firstValueFrom(videoCompartment.value$)).toBe(videos[0]);
    expect(await firstValueFrom(metaCompartment.value$)).toBe(metadata[0]);
  });

  test('caches the value', async () => {
    const videos: Video[] = [{ id: '1', title: 'Video 1' }];
    const metadata: VideoMetadata[] = [{ id: '1', duration: 1000 }];
    let nrInvocations = 0;
    const repository = createRepository<VideoRegistry>(repoToken, {
      metadata: {
        resolver: new ConfiguredEntityResolver<string, VideoMetadata>(async (key) => {
          return metadata.find((x) => x.id === key) as VideoMetadata;
        }),
      },
      videos: {
        resolver: new ConfiguredEntityResolver<string, Video>(async (key) => {
          nrInvocations++;
          return videos.find((x) => x.id === key) as Video;
        }),
      },
    });

    for (let i = 0; i < 100; i++) {
      repository.get<string, Video>('videos', '1');
    }

    await wait(200);

    expect(nrInvocations).toEqual(1);
  });

  test('invalidates and reloads the value', async () => {
    const videos: Video[] = [{ id: '1', title: 'Video 1' }];
    const metadata: VideoMetadata[] = [{ id: '1', duration: 1000 }];
    let nrInvocations = 0;
    const repository = createRepository<VideoRegistry>(repoToken, {
      metadata: {
        resolver: new ConfiguredEntityResolver<string, VideoMetadata>(async (key) => {
          return metadata.find((x) => x.id === key) as VideoMetadata;
        }),
      },
      videos: {
        resolver: new ConfiguredEntityResolver<string, Video>(async (key) => {
          nrInvocations++;
          return videos.find((x) => x.id === key) as Video;
        }),
      },
    });

    repository.get<string, Video>('videos', '1');
    repository.clear<string>('videos', '1');
    repository.get<string, Video>('videos', '1');

    await wait(200);

    expect(nrInvocations).toEqual(2);
  });

  test('invalidates all and reloads the values', async () => {
    const videos: Video[] = [
      { id: '1', title: 'Video 1' },
      { id: '2', title: 'Video 2' },
    ];
    const metadata: VideoMetadata[] = [{ id: '1', duration: 1000 }];
    let nrInvocations = 0;
    const repository = createRepository<VideoRegistry>(repoToken, {
      metadata: {
        resolver: new ConfiguredEntityResolver<string, VideoMetadata>(async (key) => {
          return metadata.find((x) => x.id === key) as VideoMetadata;
        }),
      },
      videos: {
        resolver: new ConfiguredEntityResolver<string, Video>(async (key) => {
          nrInvocations++;
          return videos.find((x) => x.id === key) as Video;
        }),
      },
    });

    repository.get<string, Video>('videos', '1');
    repository.get<string, Video>('videos', '2');
    repository.clearAll('videos');
    repository.get<string, Video>('videos', '1');
    repository.get<string, Video>('videos', '2');

    await wait(200);

    expect(nrInvocations).toEqual(4);
  });

  test('resets the values', async () => {
    const videos: Video[] = [
      { id: '1', title: 'Video 1' },
      { id: '2', title: 'Video 2' },
    ];
    const metadata: VideoMetadata[] = [{ id: '1', duration: 1000 }];
    let nrInvocations = 0;
    const repository = createRepository<VideoRegistry>(repoToken, {
      metadata: {
        resolver: new ConfiguredEntityResolver<string, VideoMetadata>(async (key) => {
          return metadata.find((x) => x.id === key) as VideoMetadata;
        }),
      },
      videos: {
        resolver: new ConfiguredEntityResolver<string, Video>(async (key) => {
          ++nrInvocations;
          return videos.find((x) => x.id === key) as Video;
        }),
      },
    });

    repository.get<string, Video>('videos', '1');
    repository.get<string, Video>('videos', '2');

    repository.reset();

    repository.get<string, Video>('videos', '1');
    repository.get<string, Video>('videos', '2');

    await wait(200);

    expect(nrInvocations).toEqual(4);
  });

  test('stores and resolves the repository', async () => {
    const videos: Video[] = [];
    const metadata: VideoMetadata[] = [];
    const repository = createRepository<VideoRegistry>(repoToken, {
      metadata: {
        resolver: new ConfiguredEntityResolver<string, VideoMetadata>(async (key) => {
          return metadata.find((x) => x.id === key) as VideoMetadata;
        }),
      },
      videos: {
        resolver: new ConfiguredEntityResolver<string, Video>(async (key) => {
          return videos.find((x) => x.id === key) as Video;
        }),
      },
    });

    const container = createContainer([useScrinium({ modules: [] })]);
    const storage = container.get<IAppStorage>(ScriniumServices.AppStorage);
    storage.storeRepository(repository);

    const sample = container.resolve(SampleService);
    sample.execute();
  });

  test('modifies the value', async () => {
    const videos: Video[] = [{ id: '1', title: 'Video 1' }];
    const metadata: VideoMetadata[] = [{ id: '1', duration: 1000 }];
    const repository = createRepository<VideoRegistry>(repoToken, {
      metadata: {
        resolver: new ConfiguredEntityResolver<string, VideoMetadata>(async (key) => {
          return metadata.find((x) => x.id === key) as VideoMetadata;
        }),
      },
      videos: {
        resolver: new ConfiguredEntityResolver<string, Video>(async (key) => {
          return videos.find((x) => x.id === key) as Video;
        }),
      },
    });

    const videoCompartment = repository.get<string, Video>('videos', '1');

    await repository.modify<string, Video>('videos', '1', async (currentValue) => {
      return { ...currentValue, title: 'Async Updated Video 1' };
    });

    expect((await firstValueFrom(videoCompartment.value$)).title).toBe('Async Updated Video 1');
  });
});

class SampleService {
  constructor(@injectRepository(repoToken.key) private readonly repository: IRepository<VideoRegistry>) {}

  execute() {
    this.repository.reset();
  }
}
