import { MockProxy, mock } from 'jest-mock-extended';
import { ITransactionOperation, executeTransaction, operationOn } from '../Transactions';
import { AccountCompartments, AccountInfoRest } from './Common';
import { DataCacheScenario, createDataCacheScenario } from '../Utils';
import { ConfiguredDataSource } from '../ConfiguredDataSource';

describe('runInTransaction', () => {
  describe('when all operations succeed', () => {
    // create like...4 different mocks
    let op1: MockProxy<ITransactionOperation>;
    let op2: MockProxy<ITransactionOperation>;
    let op3: MockProxy<ITransactionOperation>;
    let op4: MockProxy<ITransactionOperation>;

    beforeEach(async () => {
      op1 = mock<ITransactionOperation>();
      op2 = mock<ITransactionOperation>();
      op3 = mock<ITransactionOperation>();
      op4 = mock<ITransactionOperation>();

      await executeTransaction(op1, op2, op3, op4);
    });

    test('verify that all operations were executed', async () => {
      expect(op1.commit).toHaveBeenCalledTimes(1);
      expect(op2.commit).toHaveBeenCalledTimes(1);
      expect(op3.commit).toHaveBeenCalledTimes(1);
      expect(op4.commit).toHaveBeenCalledTimes(1);
    });

    test('verify that no operations were rolled back', async () => {
      expect(op1.rollback).toHaveBeenCalledTimes(0);
      expect(op2.rollback).toHaveBeenCalledTimes(0);
      expect(op3.rollback).toHaveBeenCalledTimes(0);
      expect(op4.rollback).toHaveBeenCalledTimes(0);
    });
  });

  describe('when an error occurs', () => {
    test('verify that no operations were executed after error on first', async () => {
      const op1 = mock<ITransactionOperation>();
      const op2 = mock<ITransactionOperation>();
      const op3 = mock<ITransactionOperation>();
      const op4 = mock<ITransactionOperation>();

      op1.commit.calledWith().mockRejectedValue(new Error());

      let hasError = false;
      try {
        await executeTransaction(op1, op2, op3, op4);
      } catch {
        hasError = true;
      }

      expect(hasError).toBeTruthy();
      expect(op1.commit).toHaveBeenCalledTimes(1);
      expect(op2.commit).toHaveBeenCalledTimes(0);
      expect(op3.commit).toHaveBeenCalledTimes(0);
      expect(op4.commit).toHaveBeenCalledTimes(0);
    });

    test('verify that no operations were executed after error on third', async () => {
      const op1 = mock<ITransactionOperation>();
      const op2 = mock<ITransactionOperation>();
      const op3 = mock<ITransactionOperation>();
      const op4 = mock<ITransactionOperation>();

      op2.commit.calledWith().mockRejectedValue(new Error());

      let hasError = false;
      try {
        await executeTransaction(op1, op2, op3, op4);
      } catch {
        hasError = true;
      }

      expect(hasError).toBeTruthy();
      expect(op1.commit).toHaveBeenCalledTimes(1);
      expect(op3.commit).toHaveBeenCalledTimes(0);
      expect(op4.commit).toHaveBeenCalledTimes(0);
    });

    test('verify that all executed operations were rolled back', async () => {
      const op1 = mock<ITransactionOperation>();
      const op2 = mock<ITransactionOperation>();
      const op3 = mock<ITransactionOperation>();
      const op4 = mock<ITransactionOperation>();

      op4.commit.calledWith().mockRejectedValue(new Error());

      let hasError = false;
      try {
        await executeTransaction(op1, op2, op3, op4);
      } catch {
        hasError = true;
      }

      expect(hasError).toBeTruthy();
      expect(op1.rollback).toHaveBeenCalledTimes(1);
      expect(op2.rollback).toHaveBeenCalledTimes(1);
      expect(op3.rollback).toHaveBeenCalledTimes(1);
      expect(op4.rollback).toHaveBeenCalledTimes(0);
    });
  });
});

describe('operationOn', () => {
  describe('commit', () => {
    test('updates the data compartment', async () => {
      const { cache, createProxy, waitForAllCompartments } = createOperationScenario();
      await waitForAllCompartments();

      const newAccounts: AccountInfoRest[] = [{ id: 1, title: 'New Title, who dis?', investments: [] }];
      const operation = operationOn<AccountCompartments, AccountInfoRest[]>(cache, 'plans', async () => newAccounts);

      await operation.commit();

      const current = await createProxy<AccountInfoRest[]>('plans');
      expect(current).toEqual(newAccounts);
    });
  });

  describe('rollback', () => {
    test('rolls back the committed value', async () => {
      const { accounts, cache, createProxy, waitForAllCompartments } = createOperationScenario();
      await waitForAllCompartments();

      const newAccounts: AccountInfoRest[] = [{ id: 1, title: 'New Title, who dis?', investments: [] }];
      const operation = operationOn<AccountCompartments, AccountInfoRest[]>(cache, 'plans', async () => newAccounts);

      await operation.commit();

      let current = await createProxy<AccountInfoRest[]>('plans');
      expect(current).toEqual(newAccounts);

      await operation.rollback();

      current = await createProxy<AccountInfoRest[]>('plans');
      expect(current).toEqual(accounts);
    });
  });
});

export function createOperationScenario(): DataCacheScenario<AccountCompartments> & { accounts: AccountInfoRest[] } {
  const accounts: AccountInfoRest[] = [{ id: 1, title: 'Title', investments: [] }];
  return {
    ...createDataCacheScenario<AccountCompartments>({
      plans: {
        source: new ConfiguredDataSource(async () => accounts),
        loadingOptions: {
          strategy: 'auto',
        },
        defaultValue: [],
      },
    }),
    accounts,
  };
}
