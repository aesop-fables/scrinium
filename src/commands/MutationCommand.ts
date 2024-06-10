import { IServiceContainer, inject, injectContainer } from '@aesop-fables/containr';
import { IDataCommand } from './Types';
import { IMutation, Mutation, asMutator } from '../hooks/useMutation';
import { ScriniumServices } from '../ScriniumServices';
import { IAppStorage } from '../AppStorage';

export declare type MutationCommandParams<Params> = Params & {
  mutation: IMutation<Params> | Mutation<Params>;
};

export class MutationCommand<Params> implements IDataCommand<MutationCommandParams<Params>> {
  constructor(
    @injectContainer() private readonly container: IServiceContainer,
    @inject(ScriniumServices.AppStorage) private readonly appStorage: IAppStorage,
  ) {}

  async execute(params: MutationCommandParams<Params>): Promise<void> {
    const { mutation, ...rest } = params;
    const mutator = asMutator(mutation);
    await mutator.execute({
      container: this.container,
      storage: this.appStorage,
      data: rest as Params,
    });
  }
}
