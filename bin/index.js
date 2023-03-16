#! /usr/bin/env node
const yargs = require("yargs");
const { hideBin } = require("yargs/helpers");
const argv = yargs(hideBin(process.argv)).argv;

const Mocha = require("mocha");
const path = require("path");

let mocha = new Mocha();

// path.join(path.dirname(require.resolve("am-test/package.json")), "test.js");
const testFilePath = path.join(
  path.dirname(require.resolve("am-test/package.json")),
  "test.js"
);
// console.log();

if (require.main === module) {
  // console.log("called directly");

  if (!argv.url) {
    console.log(`please provide the url of the live app to test the app.
  ex : am-test --url="somexample.com" with no last / of that url`);
    process.exitCode = 1;
    process.exit();
  }

  let url = argv.url;

  mocha.addFile(testFilePath);

  mocha.run(function (failures) {
    process.exitCode = failures ? 1 : 0; // exit with non-zero status if there were failures
  });
} else {
  console.log("required as a module");
}

/*
running mocha programmatically
https://github.com/mochajs/mocha/wiki/Using-mocha-programmatically
*/
