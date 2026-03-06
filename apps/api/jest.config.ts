import type { Config } from 'jest';

const config: Config = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: '.',
  testEnvironment: 'node',
  testRegex: '.spec.ts$',
  moduleNameMapper: {
    '^@tiba/shared$': '<rootDir>/../../packages/shared/src/index.ts',
    '^@tiba/shared/(.*)$': '<rootDir>/../../packages/shared/src/$1.ts'
  },
  transform: {
    '^.+\\.(t|j)s$': 'ts-jest'
  },
  collectCoverageFrom: ['src/**/*.ts'],
  coverageDirectory: '../coverage'
};

export default config;
