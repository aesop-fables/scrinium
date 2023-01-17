import { firstValueFrom } from 'rxjs';
import { ConfiguredEntityResolver, createRepository, RepositoryCompartmentOptions } from '../Repository';
import { Video, VideoMetadata, VideoRegistry } from './Common';
import { wait } from './utils';

describe('Repository', () => {
  test('resolves the value the first time', async () => {
    const videos: Video[] = [{ id: '1', title: 'Video 1' }];
    const metadata: VideoMetadata[] = [{ id: '1', duration: 1000 }];

    const repository = createRepository<VideoRegistry>({
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

    expect(await firstValueFrom(videoCompartment.initialized$())).toBeFalsy();
    expect(await firstValueFrom(metaCompartment.initialized$())).toBeFalsy();

    await wait(200);

    expect(await firstValueFrom(videoCompartment.initialized$())).toBeTruthy();
    expect(await firstValueFrom(metaCompartment.initialized$())).toBeTruthy();

    expect(await firstValueFrom(videoCompartment.value$)).toBe(videos[0]);
    expect(await firstValueFrom(metaCompartment.value$)).toBe(metadata[0]);
  });
});
