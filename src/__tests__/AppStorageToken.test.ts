import { AppStorageToken } from '../AppStorageToken';

describe('AppStorageToken', () => {
  test('appends the compartment key', () => {
    const token = new AppStorageToken('test');
    const compartment = token.append('compartment');
    expect(compartment.value).toBe('test/compartment');
  });
});
