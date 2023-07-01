import 'reflect-metadata';
import { Scopes, ServiceCollection, inject } from '@aesop-fables/containr';
import { ISubject, ISubjectResolver, SubjectResolver, injectSubject } from '../ISubject';
import { BehaviorSubject, Observable, firstValueFrom } from 'rxjs';
import { ScriniumServices } from '../ScriniumServices';

const messageCache = 'MessageCache';
const sampleKey = 'sampleKey';
interface IMessageCache {
  latestMessage(): string;
}

let sampleCount = 0;
class SampleSubject implements ISubject<string> {
  constructor(@inject(messageCache) private readonly cache: IMessageCache) {
    ++sampleCount;
  }

  createObservable(): Observable<string> {
    const subject = new BehaviorSubject<string>(this.cache.latestMessage());
    return subject.pipe();
  }
}

describe('SubjectResolver', () => {
  beforeEach(() => {
    sampleCount = 0;
  });

  test('resolves the subject by key and creates the observable', async () => {
    const message = 'Hello, World!';
    const cache: IMessageCache = {
      latestMessage() {
        return message;
      },
    };
    const services = new ServiceCollection();
    services.singleton<IMessageCache>(messageCache, cache);
    services.autoResolve(sampleKey, SampleSubject, Scopes.Transient);

    const resolver = new SubjectResolver(services.buildContainer());
    const observable$ = resolver.resolveSubjectByKey<string>(sampleKey);

    expect(await firstValueFrom(observable$)).toBe(message);
  });

  test('resolves the subject and creates the observable', async () => {
    const message = 'Hello, World!';
    const cache: IMessageCache = {
      latestMessage() {
        return message;
      },
    };
    const services = new ServiceCollection();
    services.singleton<IMessageCache>(messageCache, cache);

    const resolver = new SubjectResolver(services.buildContainer());
    const observable$ = resolver.resolveSubject(SampleSubject);

    expect(await firstValueFrom(observable$)).toBe(message);
  });

  test('resolves the subject (only once) and creates the observable', async () => {
    const message = 'Hello, World!';
    const cache: IMessageCache = {
      latestMessage() {
        return message;
      },
    };
    const services = new ServiceCollection();
    services.singleton<IMessageCache>(messageCache, cache);

    const resolver = new SubjectResolver(services.buildContainer());
    resolver.resolveSubject(SampleSubject);
    resolver.resolveSubject(SampleSubject);
    resolver.resolveSubject(SampleSubject);

    expect(sampleCount).toBe(1);
  });
});

describe('@injectSubject', () => {
  class SampleService {
    constructor(@injectSubject(sampleKey) private readonly message$: Observable<string>) {}

    message(): Promise<string> {
      return firstValueFrom(this.message$);
    }
  }

  test('resolves the subject by key and creates the observable', async () => {
    const message = 'Hello, World!';
    const cache: IMessageCache = {
      latestMessage() {
        return message;
      },
    };
    const services = new ServiceCollection();
    services.autoResolve<ISubjectResolver>(ScriniumServices.SubjectResolver, SubjectResolver, Scopes.Transient);
    services.singleton<IMessageCache>(messageCache, cache);
    services.autoResolve(sampleKey, SampleSubject, Scopes.Transient);

    const container = services.buildContainer();
    const sample = container.resolve(SampleService);
    expect(await sample.message()).toBe(message);
  });
});
