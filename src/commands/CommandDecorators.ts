// eslint-disable-next-line @typescript-eslint/ban-types
declare type Constructor = Function;
declare type MiddlewareAliasRegistry = { [key: string]: Constructor };

const middlewareKey = Symbol('@aesop-fables/scrinium/commands/middleware/metadata');
const registry: MiddlewareAliasRegistry = {};

const getCommandMiddlwareMetadata = (constructor: Constructor) => {
  const metadata = Reflect.getMetadata(middlewareKey, constructor);
  return metadata ?? [];
};

export function getMiddlewareAliasRegistry() {
  return registry;
}

/* eslint-disable @typescript-eslint/ban-types */
export function exposeCommandMiddleware(key: string): (target: Function) => void {
  return (constructor) => {
    registry[key] = constructor;
  };
}

export function appendCommandMiddleware(key: string): (target: Function) => void {
  return (constructor) => {
    const metadata = getCommandMiddlwareMetadata(constructor) ?? [];
    Reflect.defineMetadata(middlewareKey, [...metadata, key], constructor);
  };
}

export function findNextCommands(constructor: Constructor): Constructor[] {
  const commands: Constructor[] = [];
  const metadata = getCommandMiddlwareMetadata(constructor);
  for (let i = 0; i < metadata.length; i++) {
    const target = registry[metadata[i]];
    if (target) {
      commands.push(target);
    }
  }

  return commands;
}
