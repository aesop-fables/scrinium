import { IServiceContainer } from '@aesop-fables/containr';
import { IAppStorage } from '../AppStorage';


export interface IAppStorageModule {
  configureAppStorage(appStorage: IAppStorage, container: IServiceContainer): void;
}
