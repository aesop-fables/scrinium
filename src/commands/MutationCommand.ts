import { IServiceContainer, inject, injectContainer } from '@aesop-fables/containr';
import { IAppStorage, IMutation, Mutation, ScriniumServices, asMutator } from '@aesop-fables/scrinium';
import { IDataCommand } from './Types';

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
