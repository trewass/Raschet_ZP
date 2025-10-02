import type { Config } from 'jest';

const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/server/src', '<rootDir>/shared'],
  testMatch: ['**/__tests__/**/*.test.ts'],
  moduleNameMapper: {
    '^shared/(.*)$': '<rootDir>/shared/$1'
  }
};

export default config;
