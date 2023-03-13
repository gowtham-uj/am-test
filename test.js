const { readFile } = require("fs/promises");
const axios = require("axios");
const chai = require("chai");
const assert = require("assert");
const path = require("path");
const yargs = require("yargs/yargs");
const { hideBin } = require("yargs/helpers");
const argv = yargs(hideBin(process.argv)).argv;
// const SynchronousPromise = require("synchronous-promise");

class BBTest {
  constructor(liveLink) {
    if (liveLink == null)
      console.log(
        "please provide the destination path, that destination folder will be used as temporary place to perform automated tests."
      );
    this.liveLink = liveLink;
    this.routeDetails = {};
    // this.AMTaskTests();
  }
  // parse the json file details about routes
  async parseConfigJson() {
    const json = require("./AM-TASK.json");
    this.routeDetails = json.routes;
    // console.log(this.routeDetails);
  }

  async requester(routeObj = null, derivedDepValues = null) {
    // return the result obj of supertest
    let reqObj = {};
    reqObj.url = `${this.liveLink}${routeObj.route_path}`;
    reqObj.method = routeObj.route_type;
    if (routeObj.are_query_params === true) {
      const result =
        "?" + new URLSearchParams(routeObj.query_parameters).toString();
      reqObj.url = `${reqObj.url}${result}`;
    }

    if (routeObj.is_route_body === true) {
      // console.log(routeObj);
      reqObj.data = routeObj.route_body;
    }
    // console.log(reqObj);
    try {
      let res = await axios(reqObj);
    } catch (err) {
      return { success: false };
    }
    return { success: true };
  }

  async AMTaskTests() {
    await this.parseConfigJson();
    // console.log(this.routeDetails.length);
    // console.log(argv.url);

    for (let index = 0; index < this.routeDetails.length; index++) {
      let derivedDepValues = {};
      const route = this.routeDetails[index];
      // console.log(route);
      let requester = await this.requester(route);
      // console.log(requester);
      describe(`Working of ${route.route_desc}`, function () {
        it("should return 200 response", function () {
          assert.equal(requester.success, true);
        });
      });
    }
  }
}

// console.log(argv.url);
let test = new BBTest(argv.url);
// let test = new BBTest("http://localhost:3000");

// before(async function () {
//   return await test.AMTaskTests();
// });

describe("starting to execute the tests", function () {
  it("promise test case", async function () {
    this.timeout(10000);
    await test.AMTaskTests().catch((err) => done(err));
    // done();
  });
});
