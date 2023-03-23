#! /usr/bin/env node
require("dotenv").config();
const yargs = require("yargs");
const { hideBin } = require("yargs/helpers");
const argv = yargs(hideBin(process.argv)).argv;
const url = require("url");
const sleep = require("sleep-promise");
const htmlToPdf = require("html-to-pdf");
const puppeteer = require("puppeteer");

const Mocha = require("mocha");
const path = require("path");
const fs = require("fs");
const { exec } = require("child_process");

// console.log();

if (require.main === module) {
  let doesStoreOut = null;
  if (!argv.url) {
    console.log(`please provide the url of the live app to test the app.
  ex : am-test --url="somexample.com" with no last / of that url`);
    process.exitCode = 1;
    process.exit();
  }
  if (argv.saveOutput == "true") {
    doesStoreOut = true;
  } else if (argv.saveOutput == "false") {
    doesStoreOut = false;
  }
  // console.log("called directly");

  let mocha = new Mocha({
    reporter: "mochawesome",
    reporterOptions: {
      reportFilename: doesStoreOut ? path.resolve("./Test-Results.json") : null,
      quiet: true,
      json: true,
      html: false,
      reportTitle: "Test Results",
    },
  });

  // path.join(path.dirname(require.resolve("am-test/package.json")), "test.js");
  const testFilePath = path.join(
    path.dirname(require.resolve("am-test/package.json")),
    "test.js"
  );

  // process.env["TEST_url"] = argv.url;

  mocha.addFile(testFilePath);

  mocha.run(async function (failures) {
    // process.exitCode = failures ? 1 : 0; // exit with non-zero status if there were failures
    if (argv.saveOutput == "false") return;

    // take the markdown file and create the pdf with it
    await exec(
      `npx mochawesome-report-generator marge -i true -o "mocha-reports/" --charts true ${path.resolve(
        "./Test-Results.json"
      )}`,
      async (err, stdout, stderr) => {
        if (err) {
          // node couldn't execute the command
          // console.log(`stdout: ${stdout}`);
          // console.log(`stderr: ${stderr}`);
        }

        // function that opens up the puppeteer and creates a pdf from that html and save it as pdf.
        const docHeight = () => {
          const body = document.body;
          const html = document.documentElement;
          return Math.max(
            body.scrollHeight,
            body.offsetHeight,
            html.clientHeight,
            html.scrollHeight,
            html.offsetHeight
          );
        };

        let pathToResHtml = path.resolve(`./mocha-reports/Test-Results.html`);

        let outHtmlFileDetails = url.pathToFileURL(pathToResHtml);
        const browser = await puppeteer.launch();
        const page = await browser.newPage();
        // await page.emulateMedia("screen");

        await page.goto(outHtmlFileDetails.href, {
          waitUntil: "domcontentloaded",
        });
        await page.setViewport({
          width: 1440,
          height: 900,
          deviceScaleFactor: 2,
        });
        await sleep(1000);
        const height = await page.evaluate(docHeight);

        await page.pdf({
          path: path.resolve(`./mocha-reports/Test-Results.pdf`),
          margin: {
            top: "20px",
            left: "20px",
            right: "20px",
            bottom: "20px",
          },
          printBackground: true,
          width: "1080px",
          height: `${height * 2}px`,
        });
        await browser.close();

        // delete the prev out file
        try {
          fs.accessSync(path.resolve("./Test-Results.json"));
          fs.unlinkSync(path.resolve("./Test-results.json"));
        } catch (err) {
          console.log(
            "something went wrong please re check your inputs and run the tool again."
          );
          process.exitCode = 1;
          process.exit(1);
        }
      }
    );

    // spin up the headless chrome with puppeteer and convert the html to pdf file and save it.

    // delete the markdown file which has created before
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
