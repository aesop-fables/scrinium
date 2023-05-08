import { DataCache } from './DataCache';

export async function executeTransaction(...operations: ITransactionOperation[]): Promise<void> {
  const successful: ITransactionOperation[] = [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let error: any;
  for (let i = 0; i < operations.length; i++) {
    const operation = operations[i];
    try {
      await operation.commit();
      successful.push(operation);
    } catch (e) {
      error = e;
      break;
    }
  }

  if (error) {
    for (let i = 0; i < successful.length; i++) {
      const operation = successful[i];
      try {
        await operation.rollback();
      } catch {}
    }

    throw error;
  }
}

export interface ITransactionOperation {
  commit(): Promise<void>;
  rollback(): Promise<void>;
}

export function operationOn<Compartments, Result>(
  cache: DataCache<Compartments>,
  key: keyof Compartments,
  modifier: (value: Result) => Promise<Result>,
): ITransactionOperation {
  let stash: Result | undefined;
  return {
    async commit() {
      await cache.modify<Result>(key, async (value) => {
        stash = value;
        return modifier(value);
      });
    },
    async rollback() {
      await cache.modify<Result>(key, async () => {
        return stash as Result;
      });
    },
  };
}
