import { pipe } from "fp-ts/lib/function";
import * as TE from "fp-ts/lib/TaskEither";
import { Client } from "@elastic/elasticsearch";
import { defaultLog } from "@pagopa/winston-ts";
import { ElasticDocument, getAndIndexDocument } from "../utils/elastic";

export const cdcToElasticHandler =
  (elasticClient: Client, indexName: string) => (dbDocument: ElasticDocument) =>
    pipe(
      defaultLog.taskEither.info("cdcToElasticHandler"),
      () =>
        defaultLog.taskEither.info(
          `Calling getAndIndexDocument for index=${indexName}, dbDocument=${dbDocument}`
        ),
      () => getAndIndexDocument(elasticClient, indexName, dbDocument),
      TE.map(() => true)
    );
