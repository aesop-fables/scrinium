export class CompartmentInitializationRequested {
  static readonly Type = 'CompartmentInitializationRequested';

  constructor(public compartmentId: string) {}
}

export class CompartmentSubscriptionDestroyed {
  static readonly Type = 'CompartmentSubscriptionDestroyed';

  constructor(public compartmentId: string) {}
}

export class CompartmentPredicateResolved {
  static readonly Type = 'CompartmentPredicateResolved';

  constructor(public compartmentId: string) {}
}

export class CompartmentLoadIgnored {
  static readonly Type = 'CompartmentLoadIgnored';

  constructor(
    public compartmentId: string,
    public force: boolean,
  ) {}
}

export class CompartmentDataSourceLoadRequested {
  static readonly Type = 'CompartmentDataSourceLoadRequested';

  constructor(public compartmentId: string) {}
}

export class CompartmentDataSourceLoadFailed {
  static readonly Type = 'CompartmentDataSourceLoadFailed';

  constructor(public compartmentId: string) {}
}

export class CompartmentInitialized {
  static readonly Type = 'CompartmentInitialized';

  constructor(public compartmentId: string) {}
}

export class CompartmentLazyLoadTriggered {
  static readonly Type = 'CompartmentLazyLoadTriggered';

  constructor(public compartmentId: string) {}
}

export class CompartmentReloadRequested {
  static readonly Type = 'CompartmentReloadRequested';

  constructor(public compartmentId: string) {}
}

export class CompartmentReset {
  static readonly Type = 'CompartmentReset';

  constructor(public compartmentId: string) {}
}

export class CompartmentModified {
  static readonly Type = 'CompartmentModified';

  constructor(public compartmentId: string) {}
}

export class SubjectResolvedByKey {
  static readonly Type = 'SubjectResolvedByKey';

  constructor(public key: string) {}
}

export class SubjectPredicateResolved {
  static readonly Type = 'SubjectPredicateResolved';

  constructor(
    public key: string,
    public predicateKey: string,
  ) {}
}

export class QueryDispatched {
  static readonly Type = 'QueryDispatched';

  constructor(public name: string) {}
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function convertClassToString(value: any) {
  const str = value?.toString();
  if (!str) {
    return str;
  }

  const match = str.match(/class\s*([a-zA-Z_]*)/);
  return match[1];
}
