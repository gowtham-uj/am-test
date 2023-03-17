#! /usr/bin/env node
const yargs = require("yargs");
const { hideBin } = require("yargs/helpers");
const argv = yargs(hideBin(process.argv)).argv;

const Mocha = require("mocha");
const path = require("path");

// console.log();

if (require.main === module) {
  let doesStoreOut = null;
  if (!argv.url) {
    console.log(`please provide the url of the live app to test the app.
  ex : am-test --url="somexample.com" with no last / of that url`);
    process.exitCode = 1;
    process.exit();
  }
  if (!argv.outputDest) {
    doesStoreOut = false;
  } else if (argv.outputDest) {
    doesStoreOut = true;
  }
  // console.log("called directly");

  let mocha = new Mocha({
    reporter: "mocha-simple-html-reporter",
    reporterOptions: {
      output: doesStoreOut ? path.resolve(argv.outputDest) : null,
    },
  });

  // path.join(path.dirname(require.resolve("am-test/package.json")), "test.js");
  const testFilePath = path.join(
    path.dirname(require.resolve("am-test/package.json")),
    "test.js"
  );

  let url = argv.url;

  mocha.addFile(testFilePath);

  mocha.run(function (failures) {
    process.exitCode = failures ? 1 : 0; // exit with non-zero status if there were failures
  });
} else {
  function runTests(liveUrl, outputDest) {
    let mocha = new Mocha({
      reporter: "mocha-simple-html-reporter",
      reporterOptions: {
        output: outputDest,
      },
    });

    // path.join(path.dirname(require.resolve("am-test/package.json")), "test.js");
    const testFilePath = path.join(
      path.dirname(require.resolve("am-test/package.json")),
      "test.js"
    );

    argv.url = liveUrl;

    mocha.addFile(testFilePath);

    mocha.run(function (failures) {
      // process.exitCode = failures ? 1 : 0; // exit with non-zero status if there were failures
    });
  }
  module.exports = { runTests };
}

/*
running mocha programmatically
https://github.com/mochajs/mocha/wiki/Using-mocha-programmatically
*/
