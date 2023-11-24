import { Container, CosmosClient, Database } from "@azure/cosmos";
import * as TE from "fp-ts/TaskEither";
import * as E from "fp-ts/Either";
import * as O from "fp-ts/Option";
import { constVoid, flow, pipe } from "fp-ts/lib/function";
import { ICosmosDocument } from "./types";

export const upsertDocument = <T extends { readonly id: string }>(
  container: Container,
  payload: T
): TE.TaskEither<Error, void> =>
  pipe(
    TE.tryCatch(() => container.item(payload.id, payload.id).read(), E.toError),
    TE.chain(
      flow(
        TE.fromPredicate(
          (response) => response.statusCode !== 404,
          () => Error(`Item not found`)
        ),
        TE.map((response) =>
          pipe(
            O.some(response.resource as ICosmosDocument),
            O.map((dbitem) => ({
              ...dbitem,
              ...payload,
              version: dbitem.version + 1,
            }))
          )
        ),
        TE.orElse(() => TE.right(O.none)),
        TE.map(O.getOrElse(() => ({ ...payload, version: 0 })))
      )
    ),
    TE.chain((toUpsert) =>
      TE.tryCatch(
        () => container.items.upsert(toUpsert),
        (reason) =>
          new Error(`Impossible to Upsert document: " ${String(reason)}`)
      )
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
