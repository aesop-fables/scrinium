import { createServiceModule, IServiceModule, ServiceModule } from "@aesop-fables/containr";
import { IVideoApi, VideoApi } from "./VideoApi";
import { VideoServices } from "./VideoServices";
import axios, { Axios, AxiosInstance } from 'axios';

// export class VideoApi implements IVideoApi {

// export function useVideos(): IServiceModule {
//   return new ServiceModule('videos', (services) => {
//     services.register(VideoServices.VideoAxios, axios.create({
//       baseURL: 'https://github.com/aesop-fables/scrinium/blob/examples/examples/sample-web/src/videos/',
//     }));

//     services.use(VideoServices.VideoAxios, Axios);
//     services.use<IVideoApi>(VideoServices.VideoApi, VideoApi);
//   });
// }


export const useVideos = createServiceModule('videos', (services) => {
  services.register(VideoServices.VideoAxios, () => {
    debugger;
    return axios.create({
      baseURL: 'https://github.com/aesop-fables/scrinium/blob/examples/examples/sample-web/src/videos/',
    })}
  );
  // services.register<IAppStorage>(DataCacheServices.AppStorage, (container) => {
  //   const appStorage = new AppStorage();
  //   modules.forEach((module) => module.configureAppStorage(appStorage, container));
  //   return appStorage;
  // });
  services.use(VideoServices.VideoAxios, Axios);
  services.use<IVideoApi>(VideoServices.VideoApi, VideoApi);
});