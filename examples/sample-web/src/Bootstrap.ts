import { createContainer, IServiceContainer } from '@aesop-fables/containr';
import { useDataCache } from '@aesop-fables/scrinium';
import { withVideoDataModule } from './videos/videoDataModule';
import { useVideos } from './videos/VideoServiceModule';

export function bootstrap(): IServiceContainer {
  return createContainer([useDataCache([withVideoDataModule]), useVideos]);
}
