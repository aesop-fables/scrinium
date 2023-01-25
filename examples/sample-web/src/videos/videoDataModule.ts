import { IServiceContainer } from '@aesop-fables/containr';
import { ConfiguredEntityResolver, createDataCacheModule, createRepository, IAppStorage, RepositoryCompartmentOptions } from '../../../../src';
import { IVideoApi, VideoMetadataRest, VideoRest } from './VideoApi';
import { VideoServices } from './VideoServices';

export const VideoData = 'scrinium/examples/video';
// const videos: VideoRest[] = [{ id: '1', title: 'VideoRest 1' }];
// const metadata: VideoMetadataRest[] = [{ id: '1', duration: 1000, url: 'http://videos.com/1234' }];

// In this example, we're pretending that the data we need
// comes from two separate APIs that we need to merge together
export interface VideoRegistry {
  videos: RepositoryCompartmentOptions<string, VideoRest>;
  metadata: RepositoryCompartmentOptions<string, VideoMetadataRest>;
}

export const withVideoDataModule = createDataCacheModule((appStorage: IAppStorage, container: IServiceContainer) => {
  const api = container.get<IVideoApi>(VideoServices.VideoApi);
  const repository = createRepository<VideoRegistry>({
    metadata: {
      resolver: new ConfiguredEntityResolver<string, VideoMetadataRest>(async (key) => {
        const { data } = await api.getMetadata(key);
        return data;
      }),
    },
    videos: {
      resolver: new ConfiguredEntityResolver<string, VideoRest>(async (key) => {
        const { data } = await api.getVideo(key);
        return data;
      }),
    },
  });

  appStorage.store(VideoData, repository);
});