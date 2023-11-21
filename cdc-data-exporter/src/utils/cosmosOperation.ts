/* eslint-disable no-console */
import {
  ChangeFeedIteratorOptions,
  ChangeFeedStartFrom,
  Container,
  CosmosClient,
  Database,
  StatusCodes,
} from "@azure/cosmos";
import * as E from "fp-ts/Either";
import * as O from "fp-ts/Option";
import * as TE from "fp-ts/TaskEither";
import { pipe } from "fp-ts/lib/function";
import * as T from "fp-ts/lib/Task";
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

export const getChangeFeed =
  <T>(
    container: Container,
    leaseContainer: Container,
    continuationToken?: string
  ) =>
  (
    documentHandler: (dbDocument: T) => TE.TaskEither<Error, boolean>
  ): TE.TaskEither<Error, string> =>
    TE.tryCatch(
      async () => {
        // eslint-disable-next-line functional/no-let
        let changeFeedStartFrom = ChangeFeedStartFrom.Beginning();
        if (continuationToken) {
          changeFeedStartFrom =
            ChangeFeedStartFrom.Continuation(continuationToken);
        }
        // eslint-disable-next-line functional/no-let
        let changeFeedIteratorOptions: ChangeFeedIteratorOptions = {
          maxItemCount: 1,
          changeFeedStartFrom,
        };
        // eslint-disable-next-line no-constant-condition
        while (true) {
          for await (const result of container.items
            .getChangeFeedIterator(changeFeedIteratorOptions)
            .getAsyncIterator()) {
            if (result.statusCode === StatusCodes.NotModified) {
              console.log("No new results ", result.continuationToken);
              break;
            } else {
              console.log("Result found", result.result);
              await pipe(
                documentHandler(result.result as T),
                TE.chain(() =>
                  TE.tryCatch(
                    () =>
                      leaseContainer.items.upsert({
                        id: container.id.replace(" ", "-"),
                        lease: result.continuationToken,
                      }),
                    E.toError
                  )
                )
              )();
              changeFeedIteratorOptions = {
                maxItemCount: 1,
                changeFeedStartFrom: ChangeFeedStartFrom.Continuation(
                  result.continuationToken
                ),
              };
            }
          }
          await T.delay(1000)(T.of(void 0))();
        }
      },
      (reason) =>
        new Error(`Impossible to get the change feed: " ${String(reason)}`)
    );
