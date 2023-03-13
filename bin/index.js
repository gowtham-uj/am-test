#! /usr/bin/env node
require("top-level-await");
const yargs = require("yargs");
const { hideBin } = require("yargs/helpers");
const argv = yargs(hideBin(process.argv)).argv;

const Mocha = require("mocha");
const path = require("path");

if (!argv.url) {
  console.log(`please provide the url of the live app to test the app.
  ex : am-test --url="somexample.com" with no last / of that url`);
  process.exitCode = 1;
  process.exit();
}

let url = argv.url;

let mocha = new Mocha();

mocha.addFile(path.resolve("./test.js"));

mocha.run(function (failures) {
  process.exitCode = failures ? 1 : 0; // exit with non-zero status if there were failures
});

/*
running mocha programmatically
https://github.com/mochajs/mocha/wiki/Using-mocha-programmatically
*/
