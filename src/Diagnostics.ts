export type DiagnosticsOptions = {
  watchCompartments?: string[];
  watchCacheInitialization?: boolean;
};

export type DiagnosticsEvent = {
  compartment?: string;
  message: string;
  stack: string;
  type: string;
};

let _options: DiagnosticsOptions = {};

function getStackTrace(): string {
  const error = new Error();
  return error.stack ?? '';
}

class DiagnosticsConfiguration {
  readonly events: DiagnosticsEvent[] = [];

  get options(): DiagnosticsOptions {
    return _options;
  }

  initialize(options: DiagnosticsOptions): void {
    _options = options;
  }

  shouldObserve(key: string): boolean {
    return _options.watchCompartments?.includes(key) ?? false;
  }

  captureObserve(key: string) {
    this.events.push({
      compartment: key,
      message: `Observing: ${key}`,
      stack: getStackTrace(),
      type: 'observe$',
    });
  }

  captureCompartmentInitialized(key: string) {
    this.events.push({
      compartment: key,
      message: `Compartment[${key}].initialized$`,
      stack: getStackTrace(),
      type: 'compartmentInitialized$',
    });
  }

  captureCacheInitialized() {
    this.events.push({
      message: `DataCache.initialized$`,
      stack: getStackTrace(),
      type: 'cacheInitialized$',
    });
  }

  reset(): void {
    this.events.length = 0;
  }
}

export const ScriniumDiagnostics = new DiagnosticsConfiguration();
