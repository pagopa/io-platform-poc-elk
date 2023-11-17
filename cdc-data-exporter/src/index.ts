/* eslint-disable no-console */
import { defaultLog, useWinston, withConsole } from "@pagopa/winston-ts";
import dotenv from "dotenv";
import * as O from "fp-ts/lib/Option";
import * as TE from "fp-ts/lib/TaskEither";
import { pipe } from "fp-ts/lib/function";
import {
  cosmosConnect,
  createContainerIfNotExists,
  createDatabaseIfNotExists,
  getChangeFeed,
  getItemFromContainerById,
} from "./cosmos/cosmosOperation";

dotenv.config();
useWinston(withConsole());

export const COSMOS_CONFIG = {
  ENDPOINT: process.env.COSMOS_ENDPOINT,
  KEY: process.env.COSMOS_KEY,
};

const DATABASE = "ChangeFeedDB";
const CONTAINER = "ChangeFeedCN";
export interface ContinuationTokenItem {
  readonly id: string;
  readonly lease: string;
}

const main = () =>
  pipe(
    TE.Do,
    defaultLog.taskEither.info("Creating cosmos client..."),
    TE.bind("client", () =>
      cosmosConnect(COSMOS_CONFIG.ENDPOINT, COSMOS_CONFIG.KEY)
    ),
    defaultLog.taskEither.info("Client created"),
    defaultLog.taskEither.info("Creating Database if not exists..."),
    TE.bind("database", ({ client }) =>
      createDatabaseIfNotExists(client, DATABASE)
    ),
    defaultLog.taskEither.info("Database created"),
    defaultLog.taskEither.info("Creating container if not exists"),
    TE.bind("container", ({ database }) =>
      createContainerIfNotExists(database, CONTAINER, {
        paths: ["/id"],
      })
    ),
    defaultLog.taskEither.info("Container created"),
    defaultLog.taskEither.info("Creating lease container if not exists"),
    TE.bind("leaseContainer", ({ database }) =>
      createContainerIfNotExists(database, "Lease", {
        paths: ["/id"],
      })
    ),
    defaultLog.taskEither.info("Lease Container created"),
    defaultLog.taskEither.info("Getting continuation token if exists..."),
    TE.bind("continuationToken", ({ leaseContainer, container }) =>
      pipe(
        getItemFromContainerById(leaseContainer, container.id),
        TE.map(O.chainNullableK((tokenItem) => tokenItem.lease))
      )
    ),
    defaultLog.taskEither.info("Continuation Token evaluated"),
    defaultLog.taskEither.info("Getting change feed from database..."),
    TE.chain(({ container, leaseContainer, continuationToken }) =>
      getChangeFeed(container, leaseContainer, O.toNullable(continuationToken))
    ),
    defaultLog.taskEither.info("Change Feed consumed")
  )();

main()
  .then(console.log)
  .catch((error) => {
    console.error(error);
  });
