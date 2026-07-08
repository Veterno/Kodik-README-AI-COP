module.exports = {
  testEnvironment: 'node',
  testPathIgnorePatterns: [
    '/node_modules/',
    '/temp_projects/',
    '/dist/'
  ],
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/logger.js'
  ],
  coverageDirectory: 'coverage',
  verbose: true
};
