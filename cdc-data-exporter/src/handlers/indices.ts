import { pipe } from "fp-ts/lib/function";
import * as TE from "fp-ts/lib/TaskEither";
import { Client } from "@elastic/elasticsearch";
import { ElasticDocument, getAndIndexDocument } from "../utils/elastic";

export const cdcToElasticHandler =
  (elasticClient: Client, indexName: string) => (dbDocument: ElasticDocument) =>
    pipe(
      getAndIndexDocument(elasticClient, indexName, dbDocument),
      TE.map(() => true)
    );
