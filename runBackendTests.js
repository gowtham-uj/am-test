async function replaceFieldsWithDerivedVals(routeObj, derivedVals) {
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
async function cleanExecTemplateCode(
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
    let codeInTemplate = derivedVal.split("$$")[1].split("{")[1].split("}")[0];
    // console.log(CodeInTemplate);

    let maxReqAttempts = 10;
    let attempts = 0;
    let res = null;
    loop1: while (attempts < maxReqAttempts) {
      let result = await axios({
        url: "https://emkc.org/api/v2/piston/execute",
        method: "post",
        data: {
          language: "javascript",
          version: "18.15.0",
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
        },
      }).catch((error) => {
        if (error.response || error.request) {
        }
      });
      if (result.status === 200 && !!result.data.run) {
        res = result;
        break;
      }

      // await sleep(2 ** attempts + Math.random());
      await sleep(300);

      attempts = attempts + 1;
    }
    let cleanedOut = res.data.run.output;
    // console.log(res.run);
    derivedValsObj[derivedValKey] = cleanedOut.replace("\n", "");
    let tryJsonParse = null;

    try {
      let result = cleanedOut.replace(/[\[\]]/g, "");
      // console.log(result);
      let array = result.split(",");
      tryJsonParse = array.map((el, ind, arr) => {
        el = el.replace(/(\r\n|\r|\n)/g, "");

        el = el.replace("  '", "");
        let strArr = Array.from(el);
        strArr.forEach((el, ind, arr) => {
          if (el === "'") delete arr[ind];
        });
        el = strArr.join("");
        return el;
      });
      if (tryJsonParse.length === 1) {
        tryJsonParse = tryJsonParse[0];
      }
      derivedValsObj[derivedValKey] = tryJsonParse;
    } catch (err) {
      derivedValsObj[derivedValKey] = cleanedOut;
    }
  }
  return derivedValsObj;
}
async function requester(
  routeObj = null,
  derivedDepValues = null,
  dynamicFieldName = null
) {
  let derivedValObj = {};
  let reqObj = {};
  reqObj.url = `${this.liveLink}${routeObj.route_path}`;
  reqObj.method = routeObj.route_type;
  reqObj.headers = {};

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
    // currently only supporting the route body for dynamic fields and we can extend it later.
    let dynamicFieldOptions = ["body", "qParam", "rParam"];
    let resWithReplacedVals = null;
    // for functionality to replace the other fields also with the dynamic values.
    for (const field of dynamicFieldOptions) {
      if (dynamicFieldName === field) {
        resWithReplacedVals = await replaceFieldsWithDerivedVals(
          routeObj,
          derivedDepValues,
          dynamicFieldName
        );
      }
    }
    if (dynamicFieldName === "body") {
      reqObj.data = resWithReplacedVals;
    }
    if (dynamicFieldName === "qParam") {
      console.log("dealing with the query parameters");
      // find out all of the key value pairs with dynamic values
      let keysWithDynamicVals = {};
      for (const key in routeObj.query_parameters) {
        const qParamVal = routeObj.query_parameters[key];
        if (Array.from(qParamVal)[0] == "@") {
          keysWithDynamicVals[key] = qParamVal;
        }
      }

      // create obj with query params and derived values and add it to the url
      for (const key in keysWithDynamicVals) {
        const fieldVarName = keysWithDynamicVals[key];
        keysWithDynamicVals[key] = derivedDepValues[fieldVarName.split("@")[1]];
      }

      routeObj.query_parameters = {
        ...routeObj.query_parameters,
        ...keysWithDynamicVals,
      };

      const result =
        "?" + new URLSearchParams(routeObj.query_parameters).toString();
      reqObj.url = `${reqObj.url}${result}`;
    }
    if (dynamicFieldName === "authToken") {
      // CODE TO take the auth token and put it in the request obj
      // console.log(derivedDepValues);
      reqObj.headers["auth-token"] = `${derivedDepValues[`dep.authToken`]}`;
    }
  }

  // console.log(reqObj);
  // do the request
  let req = await axios(reqObj).catch((error) => {
    // console.log(`error in test ${error}`);
    if (error.response) {
      // The request was made and the server responded with a status code
      // that falls out of the range of 2xx
      // console.log(error.response.status);
      return error.response;
    } else if (error.request) {
      // The request was made but no response was received
      // `error.request` is an instance of XMLHttpRequest in the browser and an instance of
      // http.ClientRequest in node.js
      // console.log(error.request);
    } else {
      // Something happened in setting up the request that triggered an Error
      // console.log("Error", error.message);
    }
  });

  if (routeObj.top_level === true && (!!req ? req.status === 200 : false)) {
    return { success: true };
  } else if (
    routeObj.top_level === true &&
    (!!req ? req.status !== 200 : false)
  ) {
    return { success: false };
  }
  if (!!routeObj.dep_key && !!routeObj.dep_res_val) {
    // do resolve dynamic fields data and return it if route obj have dep_key and dep_res_key
    // console.log(req.data);
    let objForCodeExec = {
      data: req.data,
      status: req.status,
      headers: req.headers,
    };

    let result = await this.cleanExecTemplateCode(
      routeObj,
      { dep_key: "dep_res_val" },
      { res: objForCodeExec }
    );
    return result;
    // execute the js code in the dep res key
  }
  // dealing with nested routes with both dep routes and should also be derived to some values
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

async function recursiveDepRoutes(depRoutes = null) {
  let storage = {};
  let promises = [];
  for (const route of depRoutes) {
    if (!route.dependency_routes) {
      // call the requester and it should give a object of keys and values of derived routes
      let derivedVal = await requester(route);
      storage = { ...storage, ...derivedVal };
      // promises.push(derivedVal);
      continue;
    }
    // if we does have recursive routes then run the recursive function again with the dep routes of it and we will get the derived values from the routes
    let depRoutesVals = recursiveDepRoutes(route.dependency_routes);

    // pass it to the requester with the route and derived values and it will perform the request in requester and see if it have any dep key and dep res values in the route obj if yes then prepare the object with the values and return it.
    let derivedVal = await requester(route, depRoutesVals, "body");
    storage = { ...storage, ...derivedVal };
  }

  return storage;
}

async function runBackendTests(testsArr, runnerThisObj) {
  for (let index = 0; index < testsArr.length; index++) {
    let derivedDepValues = {};
    const route = testsArr[index];
    // console.log(route);
    if (!!route.dependency_routes) {
      let val = await recursiveDepRoutes(route.dependency_routes);
      derivedDepValues = { ...derivedDepValues, ...val };
      // requester for routes with derived vals here
      let routesWithDerivedVals = await requester(
        route,
        derivedDepValues,
        route.dynamic_field
      );
      if (route.negative === true) {
        describe(`${route.route_desc}`, function () {
          it("should not return 200 response", function () {
            assert.equal(
              routesWithDerivedVals != undefined
                ? routesWithDerivedVals.success
                : false,
              false
            );
          });
        });
      } else {
        describe(`${route.route_desc}`, function () {
          it("should return 200 response", function () {
            assert.equal(
              routesWithDerivedVals != undefined
                ? routesWithDerivedVals.success
                : false,
              true
            );
          });
        });
      }
      continue;
    }
    // requester with normal routes without dep routes will execute here
    let res = await requester(route);
    describe(`${route.route_desc}`, function () {
      it("should return 200 response", function () {
        assert.equal(res.success, true);
      });
    });
  }
}

module.exports = runBackendTests;
