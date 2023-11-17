import { check, fail, sleep } from "k6";
import http from "k6/http";
import * as NAR from "fp-ts/lib/NonEmptyArray";
import * as E from "fp-ts/lib/Either";
import * as B from "fp-ts/lib/boolean";
import { getConfigOrThrow } from "./utils/config";
import { pipe } from "fp-ts/lib/function";
import { generateDocument } from "./utils/generator";

const config = getConfigOrThrow();

export let options = {
  scenarios: {
    contacts: {
      executor: "constant-arrival-rate",
      rate: config.rate, // e.g. 20000 for 20K iterations
      duration: config.duration, // e.g. '1m'
      preAllocatedVUs: config.preAllocatedVUs, // e.g. 500
      maxVUs: config.maxVUs, // e.g. 1000
    },
  },
  thresholds: {
    http_req_duration: ["p(99)<1500"], // 99% of requests must complete below 1.5s
    "http_req_duration{api:checkMessages}": ["p(95)<1000"],
  },
};

const params = {
  headers: {
    "Content-Type": "application/json",
  },
};

export default function() {
  // Values from env var.
  var crudBaseUrl = `${config.CRUD_BASE_URL}`;
  let url = `${crudBaseUrl}/documents`;
  
  pipe(
    NAR.range(1, 100),
    NAR.map(() => pipe(
      generateDocument(), document =>
      http.post(url, JSON.stringify(document), {
        ...params,
        tags: { api: "newDocument" },
      }), 
      res => check(
        res,
        { "newDocument status was 200": (r) => r.status == 200 },
        { tags: { api: "newDocument" } }
      )
    )), 
    () => sleep(2)
  );
}
