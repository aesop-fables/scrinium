import { IServiceContainer } from '@aesop-fables/containr';
import { DataStore } from './DataStore';

export class MetadataSubjectContext {
  constructor(
    readonly container: IServiceContainer,
    readonly store: DataStore,
  ) {}
}
