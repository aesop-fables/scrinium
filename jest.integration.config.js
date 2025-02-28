const CI = process.env.CI === 'true';

const reporters = ['default'];

if (CI) {
  reporters.push('jest-junit');
}

// eslint-disable-next-line no-undef
module.exports = {
  reporters,
  transform: {
    '^.+\\.(t|j)sx?$': 'ts-jest',
  },
  testEnvironment: 'jsdom',
  testRegex: '(/__integration__/.*|(\\.|/)(test|spec))\\.test.[jt]sx?$',
  testPathIgnorePatterns: ['lib'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
};
