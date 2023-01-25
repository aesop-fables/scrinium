import { map, Observable } from "rxjs";
import { DataCache, fromAppStorage } from "@aesop-fables/scrinium";
import { VideoListingItem } from "./VideoApi";
import { VideoCompartments, VideoDataCache } from "./videoDataModule";

export class VideoLibrary {
  constructor(@fromAppStorage(VideoDataCache) private readonly cache: DataCache<VideoCompartments>) {}

  get loading$(): Observable<boolean> {
    return this.cache.initialized$().pipe(map((x) => !x));
  }

  get library$(): Observable<VideoListingItem[]> {
    return this.cache.observe$<VideoListingItem[]>('library');
  }
}

export class FindVideoById {

}