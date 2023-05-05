const puppeteer = require("puppeteer");
const assert = require("chai").assert;
const expect = require("chai").expect;
const axios = require("axios");

async function fetchPackageJsonFromRepo(githubUrl) {
  let githubRawFileUrl = "";
  let githubRawUrlArr = githubUrl.split("//");
  let tempStore = githubRawUrlArr[1];
  githubRawUrlArr[1] = "//raw.";
  githubRawUrlArr[2] = tempStore;
  githubRawUrlArr.push("/main/package.json");
  githubRawFileUrl = githubRawUrlArr.join("");
  try {
    let json = await axios({
      url: githubRawFileUrl,
      method: "get",
    }).catch((error) => {
      // console.log(`error in test ${error}`);
      // if (error.response) {
      //   // The request was made and the server responded with a status code
      //   // that falls out of the range of 2xx
      //   // console.log(error.response.status);
      //   return error.response;
      // } else if (error.request) {
      //   // The request was made but no response was received
      //   // `error.request` is an instance of XMLHttpRequest in the browser and an instance of
      //   // http.ClientRequest in node.js
      //   // console.log(error.request);
      // } else {
      //   // Something happened in setting up the request that triggered an Error
      //   // console.log("Error", error.message);
      // }
    });
    return json.data;
  } catch (e) {
    return { success: false };
  }
  // console.log(json);
}

function runFrontendTestsFunc(testsArr, runnerThisObj) {
  describe("Front End Test Cases", function () {
    this.timeout(100000);
    let browser;
    let page;
    this.beforeAll(async () => {
      browser = await puppeteer.launch();
      page = await browser.newPage();
    });
    testsArr.forEach((test) => {
      if (test.active === true) {
        describe(`${test.test_desc}`, function () {
          if (test.selector !== "null") {
            it(`element present in the page`, async () => {
              await page.goto(`http://localhost:3000/`);
              // expect("hello").toContain("hello");
              try {
                await page.waitForSelector(`${test.selector}`, {
                  timeout: 5000,
                });
                expect(true).to.equal(true);
              } catch (err) {
                expect(true).to.equal(false);
              }
            });
          }
          if (test.checkElHtmlName !== "null") {
            it(`check element tag name `, async () => {
              await page.goto(`http://localhost:3000/`);
              // expect("hello").toContain("hello");
              try {
                let htmlElem = await page.$eval(
                  `${test.selector}`,
                  (el) => el.tagName
                );
                expect(htmlElem.toLowerCase()).to.equal(
                  test.checkElHtmlName.toLowerCase()
                );
              } catch (err) {
                expect(true).to.equal(false);
              }
            });
          }
          if (test.checkChildElementTag !== "null") {
            it(`check child element tag name in the element`, async () => {
              console.log(test.checkChildElementTag !== "null");
              await page.goto(`http://localhost:3000/`);
              // expect("hello").toContain("hello");
              try {
                await page.waitForSelector(
                  `${test.selector} > ${test.checkChildElementTag}`,
                  {
                    timeout: 5000,
                  }
                );
                expect(true).to.equal(true);
              } catch (err) {
                expect(true).to.equal(false);
              }
            });
          }
          if (test.checkPackageName === true) {
            it(`check ${test.packageName} in package.json of github`, async () => {
              await page.goto(`http://localhost:3000/`);
              // expect("hello").toContain("hello");
              try {
                let packageJson = await fetchPackageJsonFromRepo(
                  "https://github.com/RAMANIKRISHNANR/day-24"
                );

                if (!packageJson || packageJson.success === false) {
                  throw new Error("invalid github url");
                }
                if (!packageJson.dependencies[test.packageName]) {
                  throw new Error("package name not found");
                }
                // console.log(!!packageJson.dependencies[test.packageName]);
                expect(true).to.equal(true);
              } catch (err) {
                expect(true).to.equal(false);
              }
            });
          }
        });
      }
    });

    this.afterAll(() => browser.close());
  });
}
module.exports = runFrontendTestsFunc;

/*
frontend test cases:

check id with given id or classes

// check weather all the elements tring to click does exist or not
and will click on the elements using puppeteer
click tests: {
  clicks: [],
  clickProcedures: []
}

click procedures:
these are the procedures with 3 steps


screenshot all or screenshot home option

check packages in project:

check react:

download the github repo and go to package json and find the react and react dom


for frontend tests also includes the console log errors at the end of the tests and will have a ss or text of it. preferably ss.

*/
