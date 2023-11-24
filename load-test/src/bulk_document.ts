/* eslint-disable prefer-arrow/prefer-arrow-functions */
/* eslint-disable @typescript-eslint/naming-convention */
/* eslint-disable @typescript-eslint/explicit-function-return-type */
import { check, sleep } from "k6";
import http from "k6/http";
import * as NAR from "fp-ts/lib/NonEmptyArray";
import * as E from "fp-ts/lib/Either";
import { pipe } from "fp-ts/lib/function";
import { getConfigOrThrow } from "./utils/config";
import { generateDocument } from "./utils/generator";

const config = getConfigOrThrow();

export const options = {
  scenarios: {
    contacts: {
      duration: config.duration, // e.g. '1m'
      executor: "constant-arrival-rate",
      maxVUs: config.maxVUs, // e.g. 1000
      preAllocatedVUs: config.preAllocatedVUs, // e.g. 500
      rate: config.rate // e.g. 20000 for 20K iterations
    }
  },
  thresholds: {
    http_req_duration: ["p(99)<1500"], // 99% of requests must complete below 1.5s
    "http_req_duration{api:newDocument}": ["p(95)<1000"],
    "http_req_duration{api:upsertDocument}": ["p(95)<1000"]
  }
};

const params = {
  headers: {
    "Content-Type": "application/json"
  }
};

export default function() {
  // Values from env var.
  const crudBaseUrl = `${config.CRUD_BASE_URL}`;
  const url = `${crudBaseUrl}/documents`;
  // eslint-disable-next-line functional/prefer-readonly-type
  const oddsDocuments: Array<ReturnType<typeof generateDocument>> = [];

  pipe(
    NAR.range(1, 100),
    NAR.map(idx =>
      pipe(generateDocument(), document =>
        pipe(
          idx % 2 !== 0,
          E.fromPredicate(
            isOdd => isOdd,
            () => {
              // eslint-disable-next-line functional/immutable-data
              oddsDocuments.push(document);
            }
          ),
          E.toUnion,
          () =>
            http.post(url, JSON.stringify(document), {
              ...params,
              tags: { api: "newDocument" }
            }),
          res =>
            check(
              res,
              { "newDocument status was 200": r => r.status === 200 },
              { tags: JSON.stringify({ api: "newDocument" }) }
            )
        )
      )
    ),
    () =>
      oddsDocuments.map(oddDocument =>
        pipe(
          http.post(url, JSON.stringify(oddDocument), {
            ...params,
            tags: { api: "upsertDocument" }
          }),
          res =>
            check(
              res,
              { "upsertDocument status was 200": r => r.status === 200 },
              { tags: JSON.stringify({ api: "upsertDocument" }) }
            )
        )
      ),
    () => sleep(2)
  );
}
