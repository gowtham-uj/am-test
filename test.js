const { readFile } = require("fs/promises");
const axios = require("axios");
const assert = require("chai").assert;
// const assert = require("assert");
const yargs = require("yargs/yargs");
const { hideBin } = require("yargs/helpers");
const argv = yargs(hideBin(process.argv)).argv;
const sleep = require("sleep-promise");
const MongoClient = require("mongodb").MongoClient;
// const assertProm = require("chai-as-promised");
const runFrontendTestsFunc = require("./frontendTests");
const runBackendTestsFunc = require("./runBackendTests");

class BBTest {
  constructor(liveLink) {
    this.liveLink = liveLink;
    this.routeDetails = [];
    this.dbTests = [];
    this.frontendTests = [];
    this.isDbReset = argv.dbReset;
    this.dbConfig = {
      dbmsName: argv.dbmsName,
      connectionUrl: argv.connectionUrl,
      dbName: argv.dbName,
      resetCollections: argv.resetCollections,
    };
  }
  // parse the json file details about routes
  async parseConfigJson() {
    // const json = require("./AM-TASK.json");
    const json = require("./CRM-task.json");
    if (json.areBackendTests === true) {
      this.areBackendTests = true;
      this.routeDetails = json.routes;
    }
    if (json.areDbTests === true) {
      this.areDbTests = true;
      this.dbTests = json.dbTests;
    }

    if (json.areFrontendTests === true) {
      this.areFrontendTests = true;
      this.frontendTests = json.frontendTests;
    }
    // this.isDbReset = json.DbReset;
    // this.dbConfig = json.DbResetConfig;
    // console.log(this.dbConfig.resetCollections.split(","));
  }

  async AMTaskTests() {
    await this.parseConfigJson();
    // console.log(this);
    if (this.isDbReset === "true") {
      if (this.dbConfig.dbmsName === "mongodb") {
        let connectUrl = this.dbConfig.connectionUrl;
        // console.log(connectUrl);
        const client = new MongoClient(connectUrl);

        try {
          await client.connect();
          // console.log(this.dbConfig.dbName);
          let db = await client.db(this.dbConfig.dbName);
          // console.log(await db.listCollections().toArray());
          let collectionArr = this.dbConfig.resetCollections.split(",");
          // console.log(collectionArr);
          for (const collectionName of collectionArr) {
            // console.log(collectionName);
            try {
              const result = await db
                .collection(`${collectionName}`)
                .deleteMany();
            } catch (err) {
              console.log("something went wring with the db reset ");
              return;
            }
          }
        } catch (err) {
          console.log(err);
        } finally {
          client.close();
        }
      }
    }
    if (this.areBackendTests === true) {
      await runBackendTestsFunc(this.routeDetails, this);
    }

    if (this.areFrontendTests === true) {
    }

    return { success: true };
  }
}

describe("starting to execute the tests", async function () {
  this.timeout(100000);
  this.beforeAll(async () => {
    // let test = new BBTest("https://dummy-assign-mentor.onrender.com");
    // console.log(process.env.TEST_URL);

    // parse from env variables and store it in variable and use it
    // due to render we cant modify the render the env vars so currently using static value but whne in production we will use the env variables.
    let test = new BBTest(`https://dummy-crm-app.onrender.com`);
    // let test = new BBTest(`http://localhost:4050`);

    if (!!argv.url) {
      test = new BBTest(`${argv.url}`);
    }
    let res = await test.AMTaskTests();
  });
  it("promise test case", async () => {
    this.timeout(100000);
    assert.equal(true, true);
  });
});
