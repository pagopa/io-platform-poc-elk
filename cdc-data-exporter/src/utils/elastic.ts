import * as EL from "@elastic/elasticsearch";
import * as TE from "fp-ts/TaskEither";
import * as E from "fp-ts/Either";
import * as B from "fp-ts/boolean";
import { pipe } from "fp-ts/lib/function";
import { defaultLog } from "@pagopa/winston-ts";

export interface ElasticDocument {
  readonly id: string;
  readonly [key: string]: unknown;
}

export const getElasticClient = (
  elasticNode: string
): TE.TaskEither<Error, EL.Client> =>
  TE.of(new EL.Client({ node: elasticNode }));

export const createIndex = (
  elasticClient: EL.Client,
  indexName: string
): TE.TaskEither<Error, boolean> =>
  pipe(
    TE.tryCatch(
      () => elasticClient.indices.create({ index: indexName }),
      E.toError
    ),
    TE.map((res) => res.acknowledged)
  );

export const createIndexIfNotExists = (
  elasticClient: EL.Client,
  indexName: string
): TE.TaskEither<Error, boolean> =>
  pipe(
    TE.tryCatch(
      () => elasticClient.indices.exists({ index: indexName }),
      E.toError
    ),
    TE.chain(
      B.fold(
        () => createIndex(elasticClient, indexName),
        () => TE.right(true)
      )
    )
  );

export const indexDocument = (
  elasticClient: EL.Client,
  indexName: string,
  document: ElasticDocument
) =>
  pipe(
    TE.tryCatch(
      () =>
        elasticClient.index({ index: indexName, id: document.id, document }),
      E.toError
    ),
    TE.map((response) => response.result)
  );

export const getAndIndexDocument = (
  elasticClient: EL.Client,
  indexName: string,
  document: ElasticDocument
) =>
  pipe(
    TE.Do,
    defaultLog.taskEither.info(`getAndIndexDocument => ${document}`),
    () =>
      TE.tryCatch(
        () => elasticClient.get({ index: indexName, id: document.id }),
        (e) => e as EL.errors.ResponseError
      ),
    defaultLog.taskEither.infoLeft(
      (e) => `Error getting document from index => ${String(e)}`
    ),
    TE.orElseW((resErr) => TE.right(resErr.statusCode !== 404)),
    defaultLog.taskEither.info("indexing document"),
    TE.chainW(
      B.fold(
        () =>
          TE.tryCatch(
            () =>
              elasticClient.index({
                index: indexName,
                id: document.id,
                document,
              }),
            E.toError
          ),
        () =>
          TE.tryCatch(
            () =>
              elasticClient.update({
                index: indexName,
                id: document.id,
                doc: document,
              }),
            E.toError
          )
      )
    ),
    TE.map((r) => r.result)
  );
