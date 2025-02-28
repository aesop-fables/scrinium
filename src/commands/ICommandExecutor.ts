import { IServiceContainer, Newable, inject, injectContainer } from '@aesop-fables/containr';
import { IDataCommand, IRelayCommand } from './Types';
import { MutationCommand } from './MutationCommand';
import { findNextCommands } from './CommandDecorators';
import { IMutation, Mutation } from '../hooks/useMutation';
import { getPredicateMetadata } from '../Metadata';
import { ScriniumServices } from '../ScriniumServices';
import { DataStore } from '../DataStore';
import { ISubjectResolver, resolvePredicate } from '../ISubject';
import { filter, firstValueFrom } from 'rxjs';

/**
 * @deprecated Use the upcoming `ICommandDispatcher` instead
 */
export interface ICommandExecutor {
  execute<Params, Output>(constructor: Newable<IDataCommand<Params, Output>>, params: Params): Promise<Output>;
  executeMutation<Params>(mutation: IMutation<Params> | Mutation<Params>, params: Params): Promise<void>;

  relay<Output>(constructor: Newable<IRelayCommand<Output>>): Promise<Output>;
}

export class CommandExecutor implements ICommandExecutor {
  constructor(
    @injectContainer() private readonly container: IServiceContainer,
    @inject(ScriniumServices.DataStore) private readonly dataStore: DataStore,
    @inject(ScriniumServices.SubjectResolver) private readonly resolver: ISubjectResolver,
  ) {}

  async waitForPredicate<Params, Output>(constructor: Newable<IDataCommand<Params, Output>>): Promise<void> {
    const predicateKeys = getPredicateMetadata(constructor);
    const predicate$ = resolvePredicate({
      container: this.container,
      dataStore: this.dataStore,
      predicateKeys,
      resolver: this.resolver,
    });

    if (typeof predicate$ === 'undefined') {
      return;
    }

    await firstValueFrom(predicate$.pipe(filter((predicate) => predicate === true)));
  }

  async execute<Params, Output>(constructor: Newable<IDataCommand<Params, Output>>, params: Params): Promise<Output> {
    await this.waitForPredicate(constructor);

    const operation = this.container.resolve<IDataCommand<Params, Output>>(constructor);
    const result = await operation.execute(params);

    const next = findNextCommands(constructor);
    for (let i = 0; i < next.length; i++) {
      await this.execute(next[i] as Newable<IDataCommand<Params, Output>>, params);
    }

    return result;
  }

  async executeMutation<Params>(mutation: IMutation<Params> | Mutation<Params>, params: Params): Promise<void> {
    await this.execute<Params, void>(MutationCommand<Params>, {
      mutation,
      ...params,
    });
  }

  async relay<Output>(constructor: Newable<IRelayCommand<Output>>): Promise<Output> {
    const operation = this.container.resolve(constructor);
    const result = await operation.execute();

    const next = findNextCommands(constructor);
    for (let i = 0; i < next.length; i++) {
      await this.relay(next[i] as Newable<IRelayCommand<Output>>);
    }

    return result;
  }
}
