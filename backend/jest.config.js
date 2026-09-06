module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  rootDir: '.',
  roots: ['<rootDir>/src', '<rootDir>/test'],
  moduleFileExtensions: ['ts', 'js', 'json'],
  testRegex: '.*\\.spec\\.ts$',
  transform: {
    '^.+\\.ts$': ['ts-jest', { tsconfig: { target: 'es2022', module: 'commonjs', esModuleInterop: true, experimentalDecorators: true, emitDecoratorMetadata: true, skipLibCheck: true, strict: false, isolatedModules: true } }],
  },
  collectCoverageFrom: [
    'src/application/readme/**/*.ts',
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'json-summary'],
};
