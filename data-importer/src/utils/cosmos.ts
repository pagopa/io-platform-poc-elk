import { Container, CosmosClient, Database } from "@azure/cosmos";
import * as TE from "fp-ts/TaskEither";
import * as E from "fp-ts/Either";
import { constVoid, pipe } from "fp-ts/lib/function";

export const upsertDocument = (
  container: Container,
  payload: unknown
): TE.TaskEither<Error, void> =>
  pipe(
    TE.tryCatch(
      () => container.items.upsert(payload),
      (reason) => new Error(`Impossible to Upser document: " ${String(reason)}`)
    ),
    TE.map(constVoid)
  );

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
  // eslint-disable-next-line functional/prefer-readonly-type
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
