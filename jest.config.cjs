module.exports = {
  preset: 'ts-jest/presets/default-esm',
  testEnvironment: 'jsdom',
  roots: ['<rootDir>/server', '<rootDir>/client/src'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  transform: {
    '^.+\\.(ts|tsx)$': ['ts-jest', { useESM: true }]
  },
  extensionsToTreatAsEsm: ['.ts', '.tsx'],
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js', '<rootDir>/client/src/__tests__/setupTests.ts'],
  'ts-jest': {
    useESM: true
  },
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/client/src/$1',
    '^@shared/(.*)$': '<rootDir>/shared/$1'
  }
};
