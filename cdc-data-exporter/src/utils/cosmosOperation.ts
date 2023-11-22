/* eslint-disable no-console */
import { Container, CosmosClient, Database } from "@azure/cosmos";
import * as E from "fp-ts/Either";
import * as O from "fp-ts/Option";
import * as TE from "fp-ts/TaskEither";
import { pipe } from "fp-ts/lib/function";
import { ContinuationTokenItem } from "../index";

export const generateRandomString = () =>
  Math.floor(Math.random() * Date.now()).toString(36);

export const cosmosConnect = (
  endpoint: string,
  key: string
): TE.TaskEither<Error, CosmosClient> =>
  pipe(
    E.tryCatch(
      () => new CosmosClient({ endpoint, key }),
      (reason) =>
        new Error(`Impossible to connect to Cosmos: " ${String(reason)}`)
    ),
    TE.fromEither
  );

export const createDatabaseIfNotExists = (
  client: CosmosClient,
  id: string
): TE.TaskEither<Error, Database> =>
  pipe(
    TE.tryCatch(
      () =>
        client.databases.createIfNotExists({
          id,
        }),
      (reason) =>
        new Error(`Impossible to create database: " ${String(reason)}`)
    ),
    TE.map((response) => response.database)
  );

export const createContainerIfNotExists = (
  database: Database,
  id: string,
  partitionKey: { paths: string[] }
): TE.TaskEither<Error, Container> =>
  pipe(
    TE.tryCatch(
      () =>
        database.containers.createIfNotExists({
          id,
          partitionKey,
        }),
      (reason) =>
        new Error(`Impossible to create container: " ${String(reason)}`)
    ),
    TE.map((response) => response.container)
  );

export const getItemFromContainerById = (
  container: Container,
  id: string
): TE.TaskEither<Error, O.Option<ContinuationTokenItem>> =>
  pipe(
    TE.tryCatch(
      () =>
        container.items
          .query({
            query: `SELECT * from c WHERE c.id = @id`,
            parameters: [
              {
                name: "@id",
                value: id.replace(" ", "-"),
              },
            ],
          })
          .fetchAll(),
      (reason) =>
        new Error(
          `Impossible to get item ${id} from container: ${String(reason)}`
        )
    ),
    TE.map((resp) => O.fromNullable(resp.resources[0]))
  );
