import * as DT from "@azure/data-tables";
import { constVoid, flow, pipe } from "fp-ts/lib/function";
import * as TE from "fp-ts/lib/TaskEither";
import * as O from "fp-ts/lib/Option";
import * as RA from "fp-ts/lib/ReadonlyArray";
import * as E from "fp-ts/lib/Either";
import * as B from "fp-ts/lib/boolean";
import * as t from "io-ts";
import { asyncIterableToArray } from "./async";
import { readableReport } from "./logging";

export const TableStorageVersionDocument = t.type({
  rowKey: t.string,
  partitionKey: t.string,
  id: t.string,
});
export type TableStorageVersionDocument = t.TypeOf<
  typeof TableStorageVersionDocument
>;

export const getTableServiceClient = (
  connectionString: string,
  opts?: DT.TableServiceClientOptions
) => DT.TableServiceClient.fromConnectionString(connectionString, opts);

export const getTableClient = (
  connectionString: string,
  tableName: string,
  opts?: DT.TableServiceClientOptions
) => DT.TableClient.fromConnectionString(connectionString, tableName, opts);

export const createTableIfNotExists = (
  tableServiceClient: DT.TableServiceClient,
  tableName: string
) =>
  pipe(
    TE.tryCatch(
      () =>
        asyncIterableToArray(
          tableServiceClient.listTables().byPage({ maxPageSize: 1000 })
        ),
      E.toError
    ),
    TE.map(RA.flatten),
    TE.map(RA.findFirst((tableItem) => tableItem.name === tableName)),
    TE.map(O.isSome),
    TE.chain(
      B.fold(
        () =>
          TE.tryCatch(
            () => tableServiceClient.createTable(tableName),
            E.toError
          ),
        () => TE.right(void 0)
      )
    )
  );

export const getTableDocument = <A, S>(
  tableClient: DT.TableClient,
  indexName: string,
  documentId: string,
  type: t.Type<S, A>
): TE.TaskEither<Error, O.Option<S>> =>
  pipe(
    TE.tryCatch(
      () => tableClient.getEntity(indexName, documentId),
      (e) => e as DT.RestError
    ),
    TE.map(O.some),
    TE.orElse((restError) =>
      pipe(
        restError.statusCode,
        TE.fromPredicate((statusCode) => statusCode === 404, E.toError),
        TE.map(() => O.none)
      )
    ),
    TE.chain((maybeDoc) =>
      pipe(
        maybeDoc,
        O.map(
          flow(
            type.decode,
            E.mapLeft((errs) => Error(readableReport(errs))),
            TE.fromEither,
            TE.map(O.some)
          )
        ),
        O.getOrElse(() => TE.right(maybeDoc))
      )
    )
  );

export const upsertTableDocument = <S extends TableStorageVersionDocument>(
  tableClient: DT.TableClient,
  document: S
): TE.TaskEither<Error, void> =>
  pipe(
    TE.tryCatch(() => tableClient.upsertEntity(document), E.toError),
    TE.map(constVoid)
  );
