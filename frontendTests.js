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
    }).catch((error) => {});
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
          if (!!test.clickProcedure) {
            test.clickProcedure.forEach((actionTest) => {
              it(`check change in value after an action`, async () => {
                await page.goto(`http://localhost:3000/`, {
                  timeout: 60000,
                  waitUntil: "domcontentloaded",
                });
                // expect("hello").toContain("hello");
                try {
                  let beforeActionTxtContent = await page.$eval(
                    `${actionTest.before}`,
                    (el) => el.textContent
                  );

                  await page.waitForSelector(`${actionTest.before}`);
                  await page.waitForSelector(`${actionTest.actionEl}`);
                  // evaluate code on a particular selector
                  await page.$$eval(".add-to-cart-btn", (els) => {
                    // let counter = 0;
                    for (const addToCartEl of els) {
                      addToCartEl.click();
                      // counter++;
                    }
                    // return counter;
                  });

                  let afterActionTxtContent = await page.$eval(
                    `${actionTest.before}`,
                    (el) => el.textContent
                  );
                  // console.log(beforeActionTxtContent, afterActionTxtContent);
                  if (beforeActionTxtContent == afterActionTxtContent) {
                    throw new Error("the state has not changed");
                  }
                  expect(true).to.equal(true);
                } catch (err) {
                  expect(true).to.equal(false);
                }
              });
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

check id with given id or classes - done

// check weather all the elements tring to click does exist or not
and will click on the elements using puppeteer
click tests: {
  clicks: [],
  clickProcedures: []
}

click procedures:
these are the procedures with 3 steps


screenshot all or screenshot home option

check packages in project: - done

check react:

download the github repo and go to package json and find the react and react dom


for frontend tests also includes the console log errors at the end of the tests and will have a ss or text of it. preferably ss.


no cdn are allowed and only
*/
