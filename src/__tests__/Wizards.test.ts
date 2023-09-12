/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
import 'reflect-metadata';
import { IWizardStepSource, WizardStep, WizardStepSource, createWizard, diffState } from '../Wizards';
import { firstValueFrom } from 'rxjs';
import { AccountCompartments, AccountInfo, AccountInfoRest, InvestmentInfo, createOperationScenario } from './Common';
import { DataCache } from '../DataCache';

interface TestStepData {
  firstName: string;
  lastName: string;
}

interface TestWizardParams {}

const DefaultTestStepData: TestStepData = {
  firstName: '',
  lastName: '',
};

describe('diffState', () => {
  test('detects changes from left', () => {
    const left: TestStepData = {
      firstName: 'Temp',
      lastName: 'Employee',
    };

    const right = {};

    const changes = diffState(left, right);
    expect(changes.length).toEqual(2);
    expect(changes[0].property).toEqual('firstName');
    expect(changes[0].previous).toEqual('Temp');
    expect(changes[0].value).toBeUndefined();

    expect(changes[1].property).toEqual('lastName');
    expect(changes[1].previous).toEqual('Employee');
    expect(changes[1].value).toBeUndefined();
  });

  test('detects changes from right', () => {
    const left = {};
    const right: TestStepData = {
      firstName: 'Temp',
      lastName: 'Employee',
    };

    const changes = diffState(left, right);
    expect(changes.length).toEqual(2);
    expect(changes[0].property).toEqual('firstName');
    expect(changes[0].previous).toBeUndefined();
    expect(changes[0].value).toEqual('Temp');

    expect(changes[1].property).toEqual('lastName');
    expect(changes[1].previous).toBeUndefined();
    expect(changes[1].value).toEqual('Employee');
  });
});

describe('WizardStep', () => {
  describe('isDirty()', () => {
    test('positive path', async () => {
      const step = new WizardStep<TestStepData, TestWizardParams>({
        key: 'step1',
        defaultValue: DefaultTestStepData,
        source: new WizardStepSource<TestStepData, TestWizardParams>(async () => ({
          firstName: 'Test',
          lastName: 'User',
        })),
        operation: {
          async execute() {
            // no-op
          },
        },
      });

      await step.resetState({});
      step.save({ firstName: 'Another', lastName: 'User' });

      expect(step.isDirty()).toBeTruthy();
    });

    test('negative path', async () => {
      const step = new WizardStep<TestStepData>({
        key: 'step1',
        defaultValue: DefaultTestStepData,
        source: new WizardStepSource<TestStepData, TestWizardParams>(async () => ({
          firstName: 'Test',
          lastName: 'User',
        })),
        operation: {
          async execute() {
            // no-op
          },
        },
      });

      await step.resetState({});
      expect(step.isDirty()).toBeFalsy();
    });
  });

  describe('changes$', () => {
    test('Publishes changes', async () => {
      const step = new WizardStep<TestStepData>({
        key: 'step1',
        defaultValue: DefaultTestStepData,
        source: new WizardStepSource<TestStepData, TestWizardParams>(async () => ({
          firstName: 'Test',
          lastName: 'User',
        })),
        operation: {
          async execute() {
            // no-op
          },
        },
      });

      await step.resetState({});
      step.save({ firstName: 'Another', lastName: 'User' });

      const changes = await firstValueFrom(step.changes$);
      expect(changes.length).toBe(1);
      expect(changes[0].property).toBe('firstName');
      expect(changes[0].previous).toBe('Test');
      expect(changes[0].value).toBe('Another');
    });
  });

  describe('initialized$', () => {
    test('false if reset has not been called', async () => {
      const { cache, waitForAllCompartments } = createOperationScenario();
      await waitForAllCompartments();
      const step = new WizardStep<AccountInfo>({
        key: 'step1',
        defaultValue: { id: 1, investments: [], name: '' },
        source: new WizardStepSource<AccountInfo, TestWizardParams>(async () => ({
          id: 1,
          investments: [],
          name: 'Title',
        })),
        operation: {
          async execute({ values }) {
            await cache.modify<AccountInfoRest[]>('plans', async (plans) => {
              const existing = plans.find((x) => x.id === 1);
              if (existing) {
                existing.title = values.name as string;
              }

              return plans;
            });
          },
        },
      });

      const initialized = await firstValueFrom(step.initialized$);
      expect(initialized).toBeFalsy();
    });

    test('true after reset has been called', async () => {
      const { cache, waitForAllCompartments } = createOperationScenario();
      await waitForAllCompartments();
      const step = new WizardStep<AccountInfo>({
        key: 'step1',
        defaultValue: { id: 1, investments: [], name: '' },
        source: new WizardStepSource<AccountInfo, TestWizardParams>(async () => ({
          id: 1,
          investments: [],
          name: 'Title',
        })),
        operation: {
          async execute({ values }) {
            await cache.modify<AccountInfoRest[]>('plans', async (plans) => {
              const existing = plans.find((x) => x.id === 1);
              if (existing) {
                existing.title = values.name as string;
              }

              return plans;
            });
          },
        },
      });

      await step.resetState({});
      const initialized = await firstValueFrom(step.initialized$);
      expect(initialized).toBeTruthy();
    });
  });

  describe('Integration', () => {
    test('successful operation', async () => {
      const { cache, createProxy, waitForAllCompartments } = createOperationScenario();
      await waitForAllCompartments();

      const step = new WizardStep<AccountInfo>({
        key: 'step1',
        defaultValue: { id: 1, investments: [], name: '' },
        source: new WizardStepSource<AccountInfo, TestWizardParams>(async () => ({
          id: 1,
          investments: [],
          name: 'Title',
        })),
        operation: {
          async execute({ values }) {
            await cache.modify<AccountInfoRest[]>('plans', async (plans) => {
              const existing = plans.find((x) => x.id === 1);
              if (existing) {
                existing.title = values.name as string;
              }

              return plans;
            });
          },
        },
      });

      await step.resetState({});
      step.save({ id: 1, name: 'New Title, who dis?', investments: [] });

      const operation = step.buildOperation({ steps: [] });
      await operation.commit();

      const current = await createProxy<AccountInfoRest[]>('plans');
      const newAccounts: AccountInfoRest[] = [{ id: 1, title: 'New Title, who dis?', investments: [] }];
      expect(current).toEqual(newAccounts);
    });

    test('rolled back operation', async () => {
      const { cache, waitForAllCompartments } = createOperationScenario();
      await waitForAllCompartments();

      const step = new WizardStep<AccountInfo>({
        key: 'step1',
        defaultValue: { id: 1, investments: [], name: '' },
        source: new WizardStepSource<AccountInfo, TestWizardParams>(async () => ({
          id: 1,
          investments: [],
          name: 'Title',
        })),
        operation: {
          async execute({ values }) {
            await cache.modify<AccountInfoRest[]>('plans', async (plans) => {
              const existing = plans.find((x) => x.id === 1);
              if (existing) {
                existing.title = values.name as string;
              }

              return plans;
            });
          },
        },
      });

      await step.resetState({});
      step.save({ id: 1, name: 'New Title, who dis?', investments: [] });

      const operation = step.buildOperation({ steps: [] });
      await operation.commit();
      await operation.rollback();

      expect(step.model).toEqual({ id: 1, investments: [], name: 'Title' });
    });
  });
});

interface CreateAccountInfoScreen {
  id?: number;
  name: string;
}

interface AccountInvestmentsScreen {
  investments: InvestmentInfo[];
}

interface StartCreateAccountWizardParams {
  planId?: number;
}

interface CreateAccountWizard {
  info: CreateAccountInfoScreen;
  investments: AccountInvestmentsScreen;
}

class CreateAccountWizardSource implements IWizardStepSource<CreateAccountInfoScreen, StartCreateAccountWizardParams> {
  constructor(private readonly cache: DataCache<AccountCompartments>) {}

  async load(params: StartCreateAccountWizardParams): Promise<CreateAccountInfoScreen> {
    if (!params.planId) {
      return {
        name: '',
      };
    }

    const accounts = await firstValueFrom(this.cache.observe$<AccountInfoRest[]>('plans'));
    const account = accounts.find((x) => x.id === params.planId);
    if (!account) {
      throw new Error('Invalid account');
    }

    return {
      id: account.id,
      name: account.title,
    };
  }
}

describe('createWizard', () => {
  describe('Integration', () => {
    test('selects the step', async () => {
      const wizard = createWizard<CreateAccountWizard, StartCreateAccountWizardParams>({
        info: {
          key: 'info',
          defaultValue: { id: undefined, name: '' },
          // operation: How do we get DI here?
          source: new WizardStepSource(async () => ({ id: 1, name: 'test' })),
          operation: {
            async execute(value) {
              // no-op
            },
          },
        },
        investments: {
          key: 'investments',
          defaultValue: { investments: [] },
          // operation: How do we get DI here?
          source: new WizardStepSource(async () => ({ investments: [] })),
          operation: {
            async execute() {
              // no-op
            },
          },
        },
      });

      expect(await firstValueFrom(wizard.current$)).toBeUndefined();

      wizard.selectStep('info');

      const current = await firstValueFrom(wizard.current$);
      expect(current?.key).toBe('info');
    });

    test('isStarted$', async () => {
      const wizard = createWizard<CreateAccountWizard, StartCreateAccountWizardParams>({
        info: {
          key: 'info',
          defaultValue: { id: undefined, name: '' },
          // operation: How do we get DI here?
          source: new WizardStepSource(async () => ({ id: 1, name: 'test' })),
          operation: {
            async execute(value) {
              // no-op
            },
          },
        },
        investments: {
          key: 'investments',
          defaultValue: { investments: [] },
          // operation: How do we get DI here?
          source: new WizardStepSource(async () => ({ investments: [] })),
          operation: {
            async execute() {
              // no-op
            },
          },
        },
      });

      expect(await firstValueFrom(wizard.isStarted$)).toBeFalsy();

      await wizard.start({ planId: 1 });

      expect(await firstValueFrom(wizard.isStarted$)).toBeTruthy();
    });

    test('all operations successful', async () => {
      const { cache, createProxy, waitForAllCompartments } = createOperationScenario();
      const wizard = createWizard<CreateAccountWizard, StartCreateAccountWizardParams>({
        info: {
          key: 'info',
          defaultValue: { id: undefined, name: '' },
          // operation: How do we get DI here?
          source: new CreateAccountWizardSource(cache),
          operation: {
            async execute({ values }) {
              await cache.modify<AccountInfoRest[]>('plans', async (currentValue) => {
                return [...currentValue, { id: 2, title: values.name ?? '', investments: [] }];
              });
            },
          },
        },
        investments: {
          key: 'investments',
          defaultValue: { investments: [] },
          // operation: How do we get DI here?
          source: new WizardStepSource(async () => ({ investments: [] })),
          operation: {
            async execute() {
              // no-op
            },
          },
        },
      });

      await waitForAllCompartments();
      await wizard.start({ planId: undefined });
      const step = wizard.findStep('info') as WizardStep<CreateAccountInfoScreen, StartCreateAccountWizardParams>;
      if (!step) {
        throw new Error('Could not find step');
      }

      await step.save({ name: 'Hello' });
      await wizard.save();

      const current = await createProxy<AccountInfoRest[]>('plans');
      expect(current.length).toBe(2);
      expect(current[0]).toEqual({ id: 1, title: 'Title', investments: [] });
      expect(current[1]).toEqual({ id: 2, title: 'Hello', investments: [] });
    });

    test('individual operation successful', async () => {
      const { cache, waitForAllCompartments } = createOperationScenario();
      let executed = false;
      const wizard = createWizard<CreateAccountWizard, StartCreateAccountWizardParams>({
        info: {
          key: 'info',
          defaultValue: { id: undefined, name: '' },
          source: new CreateAccountWizardSource(cache),
          operation: {
            async execute({ values }) {
              throw new Error('Not implemented');
            },
          },
        },
        investments: {
          key: 'investments',
          defaultValue: { investments: [] },
          source: new WizardStepSource(async () => ({ investments: [] })),
          operation: {
            async execute() {
              executed = true;
            },
          },
        },
      });

      await waitForAllCompartments();
      await wizard.start({ planId: undefined });
      const step = wizard.findStep('investments') as WizardStep<
        AccountInvestmentsScreen,
        StartCreateAccountWizardParams
      >;

      await step.save({ investments: [{ id: 1, name: 'Test', balance: 0 }] });
      await wizard.commitStep('investments');

      expect(executed).toBeTruthy();
    });
  });
});
