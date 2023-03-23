#! /usr/bin/env node
require("dotenv").config();
const yargs = require("yargs");
const { hideBin } = require("yargs/helpers");
const argv = yargs(hideBin(process.argv)).argv;
var url = require("url");

const Mocha = require("mocha");
const path = require("path");
const fs = require("fs");
const { execSync } = require("child_process");

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
    reporter: "mochawesome",
    reporterOptions: {
      reportFilename: doesStoreOut ? path.resolve(argv.outputDest) : null,
      quiet: true,
      json: true,
      html: false,
    },
  });

  // path.join(path.dirname(require.resolve("am-test/package.json")), "test.js");
  const testFilePath = path.join(
    path.dirname(require.resolve("am-test/package.json")),
    "test.js"
  );

  // process.env["TEST_url"] = argv.url;

  // mocha.addFile(testFilePath);

  mocha.run(async function (failures) {
    // process.exitCode = failures ? 1 : 0; // exit with non-zero status if there were failures

    // take the markdown file and create the pdf with it
    execSync(
      `npx mochawesome-report-generator marge -i true -o "mocha-reports/" ${path.resolve(
        argv.outputDest
      )}`,
      (err, stdout, stderr) => {
        if (err) {
          // node couldn't execute the command
          console.log(`stdout: ${stdout}`);
          console.log(`stderr: ${stderr}`);
          return;
        }
      }
    );

    // spin up the headless chrome with puppeteer and convert the html to pdf file and save it.

    let convertToPdf = async () => {
      const browser = await puppeteer.launch();
      const page = await browser.newPage();
      await page.goto("");
      await page.pdf({
        path: "test.pdf",
        format: "A4",
        margin: {
          top: "20px",
          left: "20px",
          right: "20px",
          bottom: "20px",
        },
      });
      await browser.close();
    };

    console.log(path.resolve(`mocha-reports/${argv.outputDest}`));

    // delete the markdown file which has created before
    try {
      fs.accessSync(path.resolve(argv.outputDest));
      fs.unlinkSync(path.resolve(argv.outputDest));
      console.log("file deleted!!");
    } catch (err) {
      console.log(
        "something went wrong please re check your inputs and run the tool again."
      );
      process.exitCode = 1;
      process.exit(1);
    }
  });
} else {
  function runTests(liveUrl, outputDest) {
    let mocha = new Mocha({
      reporter: "json",
      reporterOptions: {
        output: outputDest,
      },
    });

    // path.join(path.dirname(require.resolve("am-test/package.json")), "test.js");
    const testFilePath = path.join(
      path.dirname(require.resolve("am-test/package.json")),
      "test.js"
    );

    // console.log(liveUrl);
    // process.env["TEST_url"] = liveUrl;

    mocha.addFile(testFilePath);

    mocha.run(function (failures) {
      // process.exitCode = failures ? 1 : 0; // exit with non-zero status if there were failures
    });
  }
  module.exports = { runTests };
}
