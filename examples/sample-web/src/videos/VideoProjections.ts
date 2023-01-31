import { combineLatest, map, Observable } from 'rxjs';
import {
  createProjection,
  DataCache,
  fromAppStorage,
  IProjectionFactory,
  IRepository,
  ProjectionContext,
} from '@aesop-fables/scrinium';
import { VideoListingItem, VideoMetadataRest, VideoRest } from './VideoApi';
import { VideoCompartments, VideoDataCache, VideoRegistry, VideoRepository } from './videoDataModule';

export class VideoLibrary {
  constructor(@fromAppStorage(VideoDataCache) private readonly cache: DataCache<VideoCompartments>) {}

  get loading$(): Observable<boolean> {
    return this.cache.initialized$().pipe(map((x) => !x));
  }

  get library$(): Observable<VideoListingItem[]> {
    return this.cache.observe$<VideoListingItem[]>('library');
  }
}

interface Video {
  id: string;
  title: string;
  duration: number;
  url: string;
}

export class FindVideoByIdProjection implements IProjectionFactory<FindVideoById> {
  constructor(private readonly videoId: string) {}

  create(context: ProjectionContext): FindVideoById {
    const { container, storage } = context;
    return createProjection(storage, container, FindVideoById, this.videoId);
  }
}

class FindVideoById {
  constructor(
    private readonly videoId: string,
    @fromAppStorage(VideoRepository) private readonly repository: IRepository<VideoRegistry>,
  ) {}

  get loading$(): Observable<boolean> {
    const videoCompartment = this.repository.get<string, VideoRest>('videos', this.videoId);
    const metadataCompartment = this.repository.get<string, VideoMetadataRest>('metadata', this.videoId);

    return combineLatest([videoCompartment.initialized$(), metadataCompartment.initialized$()]).pipe(
      map(([x, y]) => !x || !y),
    );
  }

  get video$(): Observable<Video> {
    const videoCompartment = this.repository.get<string, VideoRest>('videos', this.videoId);
    const metadataCompartment = this.repository.get<string, VideoMetadataRest>('metadata', this.videoId);

    return combineLatest([videoCompartment.value$, metadataCompartment.value$]).pipe(
      map(([video, metadata]) => {
        return {
          ...video,
          ...metadata,
        } as Video;
      }),
    );
  }
}
