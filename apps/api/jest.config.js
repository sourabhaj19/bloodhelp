/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  rootDir: 'src',
  testRegex: '.*\\.spec\\.ts$',
  moduleFileExtensions: ['js', 'json', 'ts'],
  transform: {
    '^.+\\.(t|j)s$': ['ts-jest', { tsconfig: { allowSyntheticDefaultImports: true, esModuleInterop: true } }],
  },
  collectCoverageFrom: ['**/*.(t|j)s', '!main.ts', '!**/*.module.ts'],
  coverageDirectory: '../coverage',
  verbose: true,
  testTimeout: 10000,
};
