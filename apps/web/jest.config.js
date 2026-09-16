/** @type {import('jest').Config} */
module.exports = {
  preset: 'jest-preset-angular',
  setupFilesAfterEnv: ['<rootDir>/setup-jest.ts'],
  testEnvironment: 'jsdom',
  roots: ['<rootDir>/src'],
  moduleNameMapper: {
    '^src/(.*)$': '<rootDir>/src/$1',
  },
  testRegex: '.*\\.spec\\.ts$',
  transform: {
    '^.+\\.(ts|js|html)$': ['jest-preset-angular', { tsconfig: '<rootDir>/tsconfig.json', stringifyContentPathRegex: '\\.(html|svg)$' }],
  },
  transformIgnorePatterns: ['node_modules/(?!.*\\.mjs$)'],
  moduleFileExtensions: ['ts', 'html', 'js', 'json', 'mjs'],
  collectCoverageFrom: ['src/**/*.{ts,js}', '!src/main.ts', '!src/environments/**'],
  coverageDirectory: 'coverage',
  verbose: true,
};
