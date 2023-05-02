/* eslint-disable @typescript-eslint/no-unused-vars */
import 'reflect-metadata';
import { WizardStep, WizardStepSource } from '../Wizards';
import { firstValueFrom } from 'rxjs';
import { AccountCompartments, AccountInfo, AccountInfoRest, createOperationScenario } from './Common';

interface TestStepData {
  firstName: string;
  lastName: string;
}

const DefaultTestStepData: TestStepData = {
  firstName: '',
  lastName: '',
};

describe('WizardStep', () => {
  describe('isDirty()', () => {
    test('positive path', async () => {
      const step = new WizardStep<TestStepData>({
        defaultValue: DefaultTestStepData,
        source: new WizardStepSource<TestStepData>(async () => ({ firstName: 'Test', lastName: 'User' })),
        operation: {
          async execute(value: TestStepData) {
            // no-op
          },
        },
      });

      await step.resetState();
      step.save({ firstName: 'Another', lastName: 'User' });

      expect(step.isDirty()).toBeTruthy();
    });

    test('negative path', async () => {
      const step = new WizardStep<TestStepData>({
        defaultValue: DefaultTestStepData,
        source: new WizardStepSource<TestStepData>(async () => ({ firstName: 'Test', lastName: 'User' })),
        operation: {
          async execute(value: TestStepData) {
            // no-op
          },
        },
      });

      await step.resetState();
      expect(step.isDirty()).toBeFalsy();
    });
  });

  describe('changes$', () => {
    test('Publishes changes', async () => {
      const step = new WizardStep<TestStepData>({
        defaultValue: DefaultTestStepData,
        source: new WizardStepSource<TestStepData>(async () => ({ firstName: 'Test', lastName: 'User' })),
        operation: {
          async execute(value: TestStepData) {
            // no-op
          },
        },
      });

      await step.resetState();
      step.save({ firstName: 'Another', lastName: 'User' });

      const changes = await firstValueFrom(step.changes$);
      expect(changes.length).toBe(1);
      expect(changes[0].property).toBe('firstName');
      expect(changes[0].previous).toBe('Test');
      expect(changes[0].value).toBe('Another');
    });
  });

  describe('Integration', () => {
    test('successful operation', async () => {
      const { cache, createProxy, waitForAllCompartments } = createOperationScenario();
      await waitForAllCompartments();

      const step = new WizardStep<AccountInfo>({
        defaultValue: { id: 1, investments: [], name: '' },
        source: new WizardStepSource<AccountInfo>(async () => ({ id: 1, investments: [], name: 'Title' })),
        operation: {
          async execute(value: AccountInfo) {
            await cache.modify<AccountInfoRest[]>('plans', async (plans) => {
              const existing = plans.find((x) => x.id === 1);
              if (existing) {
                existing.title = value.name;
              }

              return plans;
            });
          },
        },
      });

      await step.resetState();
      step.save({ id: 1, name: 'New Title, who dis?', investments: [] });

      const operation = step.buildOperation();
      await operation.commit();

      const current = await createProxy<AccountInfoRest[]>('plans');
      const newAccounts: AccountInfoRest[] = [{ id: 1, title: 'New Title, who dis?', investments: [] }];
      expect(current).toEqual(newAccounts);
    });

    test('rolled back operation', async () => {
      const { cache, createProxy, waitForAllCompartments, accounts } = createOperationScenario();
      await waitForAllCompartments();

      const step = new WizardStep<AccountInfo>({
        defaultValue: { id: 1, investments: [], name: '' },
        source: new WizardStepSource<AccountInfo>(async () => ({ id: 1, investments: [], name: 'Title' })),
        operation: {
          async execute(value: AccountInfo) {
            await cache.modify<AccountInfoRest[]>('plans', async (plans) => {
              const existing = plans.find((x) => x.id === 1);
              if (existing) {
                existing.title = value.name;
              }

              return plans;
            });
          },
        },
      });

      await step.resetState();
      step.save({ id: 1, name: 'New Title, who dis?', investments: [] });

      const operation = step.buildOperation();
      await operation.commit();
      await operation.rollback();

      const current = await createProxy<AccountInfoRest[]>('plans');
      expect(current).toEqual(accounts);
    });
  });
});
