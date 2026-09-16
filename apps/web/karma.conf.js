// Karma configuration — legacy ng test runner (jest is primary via npm test)
// Kept for compatibility: `npx ng test` will use this, while `npm test` uses jest.
// To use: npm install --save-dev karma karma-jasmine karma-chrome-launcher jasmine-core karma-jasmine-html-reporter
// Then run: npx ng test --watch=false --browsers=ChromeHeadless
module.exports = function (config) {
  config.set({
    basePath: '',
    frameworks: ['jasmine', '@angular-devkit/build-angular'],
    plugins: [
      require('karma-jasmine'),
      require('karma-chrome-launcher'),
      require('karma-jasmine-html-reporter'),
      require('@angular-devkit/build-angular/plugins/karma'),
    ],
    client: {
      jasmine: {},
      clearContext: false,
    },
    jasmineHtmlReporter: { suppressAll: true },
    coverageReporter: { dir: require('path').join(__dirname, './coverage/web'), subdir: '.', reporters: [{ type: 'html' }, { type: 'text-summary' }] },
    reporters: ['progress', 'kjhtml'],
    browsers: ['Chrome'],
    restartOnFileChange: true,
  });
};
