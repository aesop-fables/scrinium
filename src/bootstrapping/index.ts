import { IServiceContainer, ServiceCollection } from '@aesop-fables/containr';

export * from './useDataCache';

export type ServiceModuleMiddleware = (services: ServiceCollection) => void;
export type ServiceModuleMiddlewareWithOptions<Options> = (services: ServiceCollection, options: Options) => void;

export type ServiceModuleMiddlewareWithOptionsFactory<Options> = (options: Options) => IServiceModule;

export interface IServiceModule {
  name: string;
  configureServices: ServiceModuleMiddleware;
}

export class ServiceModule implements IServiceModule {
  public readonly name: string;
  private readonly middlware: ServiceModuleMiddleware;

  constructor(name: string, middleware: ServiceModuleMiddleware) {
    this.name = name;
    this.middlware = middleware;
  }

  configureServices(services: ServiceCollection): void {
    this.middlware(services);
  }
}

export class ServiceModuleWithOptions<Options> implements IServiceModule {
  public readonly name: string;
  public readonly options: Options;
  private readonly middlware: ServiceModuleMiddlewareWithOptions<Options>;

  constructor(name: string, options: Options, middleware: ServiceModuleMiddlewareWithOptions<Options>) {
    this.name = name;
    this.options = options;
    this.middlware = middleware;
  }

  configureServices(services: ServiceCollection): void {
    this.middlware(services, this.options);
  }
}

export function createServiceModule(name: string, middleware: ServiceModuleMiddleware): IServiceModule {
  return new ServiceModule(name, middleware);
}

export function createServiceModuleWithOptions<Options>(
  name: string,
  factory: ServiceModuleMiddlewareWithOptions<Options>,
): ServiceModuleMiddlewareWithOptionsFactory<Options> {
  return (options: Options) => {
    return new ServiceModuleWithOptions<Options>(name, options, factory);
  };
}

export interface IActivator {
  // TODO -- we might want to make this async in the future
  // to facilitate eager-loading a cache, etc.
  activate(): void;
}

export const BootstrappingServices = {
  Activators: 'activators',
};

export interface BootstrapOptions {
  runActivators: boolean;
}

const defaultOptions: BootstrapOptions = {
  runActivators: true,
};

export function createContainer(
  modules: IServiceModule[],
  options: BootstrapOptions = defaultOptions,
): IServiceContainer {
  const services = new ServiceCollection();
  modules.forEach((module) => module.configureServices(services));

  const container = services.buildContainer();
  if (options.runActivators && services.isRegistered(BootstrappingServices.Activators)) {
    const activators = container.get<IActivator[]>(BootstrappingServices.Activators);
    if (activators && activators.length) {
      activators.forEach((x) => x.activate());
    }
  }

  return container;
}
