import { pipe } from "fp-ts/lib/function";
import * as TE from "fp-ts/lib/TaskEither";
import { defaultLog } from "@pagopa/winston-ts";
import { ElasticDocument } from "../utils/types";

export const cdcToElasticHandler =
  (
    deduplicationStrategyHandler: (
      doc: ElasticDocument
    ) => TE.TaskEither<Error, boolean>
  ) =>
  (dbDocument: ElasticDocument) =>
    pipe(
      defaultLog.taskEither.info("cdcToElasticHandler"),
      () =>
        defaultLog.taskEither.info(
          `Calling deduplicationStrategyHandler for dbDocument=${dbDocument}`
        ),
      () => deduplicationStrategyHandler(dbDocument)
    );
