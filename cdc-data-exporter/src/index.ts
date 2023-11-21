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
} from "./utils/cosmosOperation";
import { cdcToElasticHandler } from "./handlers/indices";
import { createIndexIfNotExists, getElasticClient } from "./utils/elastic";

dotenv.config();
useWinston(withConsole());

export const CONFIG = {
  COSMOS_ENDPOINT: process.env.COSMOS_ENDPOINT,
  COSMOS_KEY: process.env.COSMOS_KEY,
  ELASTIC_NODE: process.env.ELASTIC_NODE,
};

const DATABASE = "ChangeFeedDB";
const CONTAINER = "ChangeFeedCN";
const ELASTIC_INDEX_NAME = "test";
export interface ContinuationTokenItem {
  readonly id: string;
  readonly lease: string;
}

const main = () =>
  pipe(
    TE.Do,
    defaultLog.taskEither.info("Creating cosmos client..."),
    TE.bind("client", () =>
      cosmosConnect(CONFIG.COSMOS_ENDPOINT, CONFIG.COSMOS_KEY)
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
    TE.bind(
      "changeFeedProcessor",
      ({ container, leaseContainer, continuationToken }) =>
        TE.of(
          getChangeFeed(
            container,
            leaseContainer,
            O.toNullable(continuationToken)
          )
        )
    ),
    defaultLog.taskEither.info("Getting change feed from database..."),
    TE.chain(({ changeFeedProcessor }) =>
      pipe(
        getElasticClient(CONFIG.ELASTIC_NODE),
        TE.bindTo("elasticClient"),
        TE.bind("indexCreation", ({ elasticClient }) =>
          createIndexIfNotExists(elasticClient, ELASTIC_INDEX_NAME)
        ),
        TE.chain(({ elasticClient }) =>
          changeFeedProcessor(
            cdcToElasticHandler(elasticClient, ELASTIC_INDEX_NAME)
          )
        )
      )
    ),
    defaultLog.taskEither.info("Change Feed consumed")
  )();

main()
  .then(console.log)
  .catch((error) => {
    console.error(error);
  });
