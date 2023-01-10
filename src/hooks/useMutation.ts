import { useState } from 'react';
import { IAppStorage, useAppStorage } from '../AppStorage';
import { IServiceContainer } from '@aesop-fables/containr';
import { useServiceContainer } from '@aesop-fables/containr-react';

export interface MutationContext<T> {
  storage: IAppStorage;
  container: IServiceContainer;
  data: T;
}

export interface IMutation<T> {
  execute(context: MutationContext<T>): Promise<void>;
}

// eslint-disable-next-line no-shadow
export enum MutationStatus {
  Idle,
  Executing,
  // Error, (see the error property)
  Complete,
}

export type Mutation<Data> = (data: Data) => Promise<void>;

export interface MutatorState<Data> {
  action: Mutation<Data>;
  status: MutationStatus;
  error?: Error;
}

export interface WrapMutationParams<Data> {
  container: IServiceContainer;
  storage: IAppStorage;
  mutator: IMutation<Data>;
  onStatusChanged: (status: MutationStatus) => void;
  onError: (err: Error) => void;
}

export function asMutation<Data>(params: WrapMutationParams<Data>): Mutation<Data> {
  const { container, storage, mutator, onStatusChanged, onError } = params;
  return async (data: Data) => {
    onStatusChanged(MutationStatus.Executing);
    try {
      await mutator.execute({
        container,
        storage,
        data,
      });
    } catch (e) {
      console.log(e);
      onError(e as Error);
    } finally {
      onStatusChanged(MutationStatus.Complete);
    }
  };
}

export function asMutator<Data>(mutation: IMutation<Data> | Mutation<Data>): IMutation<Data> {
  let mutator: IMutation<Data>;
  if (typeof (mutation as IMutation<Data>).execute === 'undefined') {
    mutator = {
      async execute(context: MutationContext<Data>): Promise<void> {
        const { data } = context;
        await (mutation as Mutation<Data>)(data);
      },
    };
  } else {
    mutator = mutation as IMutation<Data>;
  }

  return mutator;
}

export function useMutation<Data>(mutation: IMutation<Data> | Mutation<Data>): MutatorState<Data> {
  const [status, setStatus] = useState(MutationStatus.Idle);
  const [error, setError] = useState<Error | undefined>(undefined);
  const storage = useAppStorage();
  const container = useServiceContainer();
  const mutator = asMutator<Data>(mutation);

  const wrappedAction: Mutation<Data> = asMutation<Data>({
    container,
    storage,
    mutator,
    onStatusChanged: (x) => setStatus(x),
    onError: (err) => setError(err),
  });

  return {
    action: wrappedAction,
    status,
    error,
  };
}
