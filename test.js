const { readFile } = require("fs/promises");
const axios = require("axios");
const chai = require("chai");
const assert = require("assert");
const yargs = require("yargs/yargs");
const { hideBin } = require("yargs/helpers");
const argv = yargs(hideBin(process.argv)).argv;
const sleep = require("sleep-promise");
const piston = require("piston-client");

class BBTest {
  constructor(liveLink) {
    if (liveLink == null)
      console.log(
        "please provide the destination path, that destination folder will be used as temporary place to perform automated tests."
      );
    this.liveLink = liveLink;
    this.routeDetails = {};
  }
  // parse the json file details about routes
  async parseConfigJson() {
    const json = require("./AM-TASK.json");
    this.routeDetails = json.routes;
  }
  async replaceFieldsWithDerivedVals(routeObj, derivedVals) {
    // console.log(derivedVals);
    for (const key in routeObj.route_body) {
      const element = routeObj.route_body[key].split("@")[1];
      // console.log(element);
      for (const dVal in derivedVals) {
        const derivedVal = derivedVals[key];
        if (dVal === element) {
          // console.log(derivedVals[dVal]);
          routeObj.route_body[key] = derivedVals[dVal];
        }
      }
    }
    return routeObj.route_body;
  }
  async cleanExecTemplateCode(
    templateCodeObj = null,
    templateKeyNames = null,
    templateDepDataObj = null
  ) {
    let derivedValsObj = {};

    for (const key in templateKeyNames) {
      const element = templateKeyNames[key];
      derivedValsObj[templateCodeObj[key]] = templateCodeObj[element];
    }

    // console.log(derivedValsObj);
    for (const derivedValKey in derivedValsObj) {
      const derivedVal = derivedValsObj[derivedValKey];
      let codeInTemplate = derivedVal
        .split("$$")[1]
        .split("{")[1]
        .split("}")[0];
      // console.log(CodeInTemplate);

      let maxReqAttempts = 10;
      let attempts = 0;
      let res = null;
      while (attempts < maxReqAttempts) {
        const client = piston({ server: "https://emkc.org" });

        let result = await client.execute({
          language: "javascript",
          version: "16.3.0",
          files: [
            {
              name: "my_cool_code.js",
              content: `let res = JSON.parse(process.argv[2]); console.log(${codeInTemplate});`,
            },
          ],
          stdin: "",
          args: [JSON.stringify(templateDepDataObj.res)],
          compileTimeout: 10000,
          runTimeout: 3000,
          compileMemoryLimit: -1,
          runMemoryLimit: -1,
        });
        if (result.message != "Requests limited to 1 per 200ms") {
          res = result;
          break;
        }

        // await sleep(2 ** attempts + Math.random());
        await sleep(300);

        attempts = attempts + 1;
      }
      let cleanedOut = res.run.output;
      // console.log(res.run);
      derivedValsObj[derivedValKey] = cleanedOut;
      let tryJsonParse = null;

      try {
        let result = cleanedOut.replace(/[\[\]]/g, "");
        // console.log(result);
        let array = result.split(",");
        tryJsonParse = array;
        derivedValsObj[derivedValKey] = tryJsonParse;
      } catch (err) {
        derivedValsObj[derivedValKey] = cleanedOut;
      }
    }
    return derivedValsObj;
  }
  async requester(
    routeObj = null,
    derivedDepValues = null,
    dynamicFieldName = null
  ) {
    let derivedValObj = {};
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

    // if the there is dependency routes and there is req body then execute the replaceDerivedValues function and get the req body obj and replace it with the before.
    if (
      !!routeObj.dependency_routes &&
      !!derivedDepValues &&
      !!dynamicFieldName
    ) {
      // currently only supporting the route body for dynamic field sand we can extend it later.
      let dynamicFieldOptions = ["body", "qParam", "rParam"];
      let resWithReplacedVals = null;
      // for functionality to replace the other fields also with the dynamic values.
      for (const field of dynamicFieldOptions) {
        if (dynamicFieldName === field) {
          resWithReplacedVals = await this.replaceFieldsWithDerivedVals(
            routeObj,
            derivedDepValues,
            dynamicFieldName
          );
        }
      }
      if (dynamicFieldName === "body") {
        reqObj.data = resWithReplacedVals;
      }
    }

    // console.log(reqObj);
    // do the request
    let req = await axios(reqObj);

    if (routeObj.top_level === true && req.status === 200) {
      describe(`Working of ${routeObj.route_desc}`, function () {
        it("should return 200 response", function () {
          assert.equal(req.status, 200);
        });
      });
    }

    // do resolve dynamic fields data and return it if route obj have dep_key and dep_res_key
    if (!!routeObj.dep_key && !!routeObj.dep_res_val) {
      // console.log(req.data);
      let objForCodeExec = {
        data: req.data,
        status: req.status,
      };

      let result = await this.cleanExecTemplateCode(
        routeObj,
        { dep_key: "dep_res_val" },
        { res: objForCodeExec }
      );
      return result;
      // execute the js code in the dep res key
    }
    // dealing with nested routes with both dep routes and should also be derived to some vales
    if (
      !!routeObj.dep_key &&
      !!routeObj.dep_res_val &&
      !!routeObj.dependency_routes
    ) {
      // console.log(req.data);
      let objForCodeExec = {
        data: req.data,
        status: req.status,
      };

      let result = await this.cleanExecTemplateCode(
        routeObj,
        { dep_key: "dep_res_val" },
        { res: objForCodeExec }
      );
      return result;
      // execute the js code in the dep res key
    }
  }

  async recursiveDepRoutes(depRoutes = null) {
    let storage = {};
    let promises = [];
    for (const route of depRoutes) {
      if (!route.dependency_routes) {
        // call the requester and it should give a object of keys and values of derived routes
        let derivedVal = await this.requester(route);
        storage = { ...storage, ...derivedVal };
        // promises.push(derivedVal);
        continue;
      }
      // if we does have recursive routes then run the recursive function again with the dep routes of it and we will get the derived values from the routes
      let depRoutesVals = this.recursiveDepRoutes(route.dependency_routes);

      // pass it to the requester with the route and derived values and it will perform the request in requester and see if it have any dep key and dep res values in the route obj if yes then prepare the object with the values and return it.
      let derivedVal = await this.requester(route, depRoutesVals, "body");
      storage = { ...storage, ...derivedVal };
    }

    return storage;
  }

  async AMTaskTests() {
    await this.parseConfigJson();
    // console.log(this.routeDetails.length);

    for (let index = 0; index < this.routeDetails.length; index++) {
      let derivedDepValues = {};
      const route = this.routeDetails[index];
      // console.log(route);
      if (!!route.dependency_routes) {
        let val = await this.recursiveDepRoutes(route.dependency_routes);
        derivedDepValues = { ...derivedDepValues, ...val };
        // requester with derived vals here
        let routesWithDerivedVals = await this.requester(
          route,
          derivedDepValues,
          "body"
        );
        continue;
      }
      // requester with normal routes without dep routes will execute here
      let res = await this.requester(route);
    }
  }
}

let test = new BBTest(argv.url);

describe("starting to execute the tests", function () {
  it("promise test case", async function (done) {
    this.timeout(100000);
    await test.AMTaskTests().catch((err) => done(err));
    // done();
  });
});
