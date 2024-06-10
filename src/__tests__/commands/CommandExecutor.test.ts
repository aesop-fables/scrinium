/* eslint-disable @typescript-eslint/ban-types */
import 'reflect-metadata';
import { createContainer, inject } from '@aesop-fables/containr';
import { CommandExecutor, IDataCommand, appendCommandMiddleware, exposeCommandMiddleware } from '../../commands';

describe('Command Executor', () => {
  test('Executes a single command', async () => {
    const messages: string[] = [];
    const container = createContainer([
      {
        name: 'tests',
        configureServices(services) {
          services.singleton(SampleServices.messages, messages);
        },
      },
    ]);
    const commands = container.resolve(CommandExecutor);

    await commands.execute(SampleCommand, 'hello, world');

    expect(messages.length).toBe(1);
    expect(messages[0]).toBe('hello, world');
  });

  test('Executes a command with appended middleware', async () => {
    const messages: string[] = [];
    const container = createContainer([
      {
        name: 'tests',
        configureServices(services) {
          services.singleton(SampleServices.messages, messages);
        },
      },
    ]);
    const commands = container.resolve(CommandExecutor);

    await commands.execute(WrappedCommand, 'hello, world');

    expect(messages.length).toBe(2);
    expect(messages[0]).toBe('hello, world');
    expect(messages[1]).toBe('hello, world (edited)');
  });
});

const SampleServices = { messages: 'messages', wrapper: 'wrapperCommand' };

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

/* eslint-disable @typescript-eslint/no-unused-vars */
@exposeCommandMiddleware(SampleServices.wrapper)
class SampleMiddlewareCommand implements IDataCommand<string, void> {
  constructor(@inject(SampleServices.messages) private readonly messages: string[]) {}

  async execute(input: string): Promise<void> {
    this.messages.push(`${input} (edited)`);
  }
}
