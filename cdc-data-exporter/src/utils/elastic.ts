import * as EL from "@elastic/elasticsearch";
import * as TE from "fp-ts/TaskEither";
import * as E from "fp-ts/Either";
import * as B from "fp-ts/boolean";
import { pipe } from "fp-ts/lib/function";

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
    TE.tryCatch(
      () => elasticClient.get({ index: indexName, id: document.id }),
      E.toError
    ),
    TE.map((getResponse) => getResponse.found),
    TE.chain(
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
