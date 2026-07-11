module.exports = {
  testEnvironment: 'node',
  testPathIgnorePatterns: [
    '/node_modules/',
    '/temp_projects/',
    '/dist/',
    '/.benchmark-temp/'
  ],
  modulePathIgnorePatterns: [
    '<rootDir>/.benchmark-temp/'
  ],
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/core/logger.js'
  ],
  coverageDirectory: 'coverage',
  verbose: true
};
