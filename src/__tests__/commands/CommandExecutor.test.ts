/* eslint-disable @typescript-eslint/ban-types */
import 'reflect-metadata';
import { createContainer, inject, IServiceContainer, Scopes } from '@aesop-fables/containr';
import { CommandExecutor, IDataCommand, appendCommandMiddleware, exposeCommandMiddleware } from '../../commands';
import { createMetadataDecorator } from '../../Metadata';
import { BehaviorSubject, throwError, timeout } from 'rxjs';
import { ScriniumServices } from '../../ScriniumServices';
import { DataStore } from '../../DataStore';
import { DataCatalog } from '../../DataCatalog';
import { SubjectResolver } from '../../ISubject';

describe('Command Executor', () => {
  let messages: string[];
  let predicate: BehaviorSubject<boolean>;
  let container: IServiceContainer;
  let commands: CommandExecutor;

  beforeEach(() => {
    messages = [];
    predicate = new BehaviorSubject(false);
    container = createContainer([
      {
        name: 'tests',
        configureServices(services) {
          const dataStore = new DataStore(new DataCatalog());
          services.singleton(ScriniumServices.DataStore, dataStore);
          services.autoResolve(ScriniumServices.SubjectResolver, SubjectResolver, Scopes.Singleton);
          services.singleton(SampleServices.messages, messages);
          services.singleton(SampleServices.observable, predicate);
        },
      },
    ]);

    commands = container.resolve(CommandExecutor);
  });

  test('Executes a single command', async () => {
    await commands.execute(SampleCommand, 'hello, world');

    expect(messages.length).toBe(1);
    expect(messages[0]).toBe('hello, world');
  });

  test('Executes a command with appended middleware', async () => {
    await commands.execute(WrappedCommand, 'hello, world');

    expect(messages.length).toBe(2);
    expect(messages[0]).toBe('hello, world');
    expect(messages[1]).toBe('hello, world (edited)');
  });

  test('Waits for predicate before executing command', async () => {
    let hasError = false;
    try {
      await commands.execute(PredicateCommand, 'hello, world');
    } catch {
      hasError = true;
    }

    expect(hasError).toBeTruthy();
    expect(messages.length).toBe(0);
  });

  test('Waits for predicate and executes command when it turns true', async () => {
    await Promise.all([
      new Promise<void>((resolve) => {
        setTimeout(() => {
          predicate.next(true);
          resolve();
        }, 50);
      }),
      await commands.execute(PredicateCommand, 'hello, world'),
    ]);

    expect(messages.length).toBe(1);
  });
});

const SampleServices = { messages: 'messages', observable: 'observable', wrapper: 'wrapperCommand' };

class SampleCommand implements IDataCommand<string, void> {
  constructor(@inject(SampleServices.messages) private readonly messages: string[]) {}

  async execute(input: string): Promise<void> {
    this.messages.push(input);
  }
}

@appendCommandMiddleware(SampleServices.wrapper)
class WrappedCommand implements IDataCommand<string, void> {
  constructor(@inject(SampleServices.messages) private readonly messages: string[]) {}

  async execute(input: string): Promise<void> {
    this.messages.push(input);
  }
}

const samplePredicate = createMetadataDecorator<boolean>((target, context) => {
  return context.container.get<BehaviorSubject<boolean>>(SampleServices.observable).pipe(
    timeout({
      each: 250,
      with: () => throwError(() => new Error('Timed out')),
    }),
  );
});

@samplePredicate
class PredicateCommand implements IDataCommand<string, void> {
  constructor(@inject(SampleServices.messages) private readonly messages: string[]) {}

  async execute(input: string): Promise<void> {
    this.messages.push(input);
  }
}

/* eslint-disable @typescript-eslint/no-unused-vars */
@exposeCommandMiddleware(SampleServices.wrapper)
class SampleMiddlewareCommand implements IDataCommand<string, void> {
  constructor(@inject(SampleServices.messages) private readonly messages: string[]) {}

  async execute(input: string): Promise<void> {
    this.messages.push(`${input} (edited)`);
  }
}
