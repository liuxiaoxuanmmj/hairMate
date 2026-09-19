module.exports = {
  preset: 'jest-expo',
  testMatch: ['<rootDir>/src/**/*.test.tsx'],
  moduleNameMapper: {
    '^@hairmate/api-client$': '<rootDir>/../../packages/api-client/src/index.ts',
    '^@hairmate/contracts$': '<rootDir>/../../packages/contracts/src/index.ts',
  },
};
