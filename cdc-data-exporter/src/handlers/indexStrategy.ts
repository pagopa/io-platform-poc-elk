import * as EL from "@elastic/elasticsearch";
import * as TE from "fp-ts/TaskEither";
import * as B from "fp-ts/boolean";
import * as O from "fp-ts/Option";
import { flow, pipe } from "fp-ts/lib/function";
import { defaultLog } from "@pagopa/winston-ts";
import { TableClient } from "@azure/data-tables";
import { ElasticDocument } from "../utils/types";
import {
  TableStorageVersionDocument,
  getTableDocument,
  upsertTableDocument,
} from "../utils/tableStorage";
import { indexDocument, updateIndexDocument } from "../utils/elastic";

export const getAndIndexDocument =
  (elasticClient: EL.Client, indexName: string) =>
  (document: ElasticDocument) =>
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
          () => indexDocument(elasticClient, indexName, document),
          () => updateIndexDocument(elasticClient, indexName, document)
        )
      ),
      TE.map(() => true)
    );

export const getAndIndexDocumentWithTableStorageDeduplication =
  (elasticClient: EL.Client, tableClient: TableClient, indexName: string) =>
  (document: ElasticDocument) =>
    pipe(
      TE.Do,
      defaultLog.taskEither.info(
        `getAndIndexDocumentWithTableStorageDeduplication => ${document}`
      ),
      () =>
        getTableDocument(
          tableClient,
          indexName,
          document.id,
          TableStorageVersionDocument
        ),
      defaultLog.taskEither.infoLeft(
        (e) => `Error getting document from index table => ${String(e)}`
      ),
      defaultLog.taskEither.info("indexing document"),
      TE.chain(
        flow(
          O.map(() => updateIndexDocument(elasticClient, indexName, document)),
          O.getOrElse(() => indexDocument(elasticClient, indexName, document))
        )
      ),
      TE.chain(() =>
        upsertTableDocument(tableClient, {
          rowKey: document.id,
          partitionKey: indexName,
          id: document.id,
        })
      ),
      TE.map(() => true)
    );
