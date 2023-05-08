import 'reflect-metadata';
import { ServiceCollection, inject } from '@aesop-fables/containr';
import { ISubject, SubjectResolver } from '../ISubject';
import { BehaviorSubject, Observable, firstValueFrom } from 'rxjs';

const messageCache = 'MessageCache';
const sampleKey = 'sampleKey';
interface IMessageCache {
  latestMessage(): string;
}

describe('SubjectResolver', () => {
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
    services.register<IMessageCache>(messageCache, cache);
    services.use(sampleKey, SampleSubject);

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
    services.register<IMessageCache>(messageCache, cache);

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
    services.register<IMessageCache>(messageCache, cache);

    const resolver = new SubjectResolver(services.buildContainer());
    resolver.resolveSubject(SampleSubject);
    resolver.resolveSubject(SampleSubject);
    resolver.resolveSubject(SampleSubject);

    expect(sampleCount).toBe(1);
  });
});
