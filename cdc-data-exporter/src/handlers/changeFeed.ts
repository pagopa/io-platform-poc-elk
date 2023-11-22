/* eslint-disable no-console */
import {
  ChangeFeedIteratorOptions,
  ChangeFeedStartFrom,
  Container,
  StatusCodes,
} from "@azure/cosmos";
import * as E from "fp-ts/Either";
import * as B from "fp-ts/boolean";
import * as O from "fp-ts/Option";
import * as TE from "fp-ts/TaskEither";
import * as AR from "fp-ts/Array";
import { flow, pipe } from "fp-ts/lib/function";
import { defaultLog } from "@pagopa/winston-ts";
import { delayTaskEither } from "../utils/async";

export const changeFeedHandler =
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
          for await (const res of container.items
            .getChangeFeedIterator(changeFeedIteratorOptions)
            .getAsyncIterator()) {
            await pipe(
              res,
              TE.right,
              TE.chain((iterResponse) =>
                pipe(
                  iterResponse.statusCode === StatusCodes.NotModified,
                  B.fold(
                    () =>
                      pipe(
                        Date.now(),
                        TE.right,
                        TE.bindTo("startDate"),
                        defaultLog.taskEither.info("Calling documentHandler"),
                        TE.chain(({ startDate }) =>
                          pipe(
                            iterResponse.result,
                            AR.head,
                            O.map((resource) => resource as T),
                            O.map(
                              flow(
                                documentHandler,
                                defaultLog.taskEither.info(
                                  `Indexing document took ${
                                    Date.now() - startDate
                                  } milliseconds`
                                ),
                                TE.chain(() =>
                                  TE.tryCatch(
                                    () =>
                                      leaseContainer.items.upsert({
                                        id: container.id.replace(" ", "-"),
                                        lease: iterResponse.continuationToken,
                                      }),
                                    E.toError
                                  )
                                ),
                                TE.map(() => {
                                  changeFeedIteratorOptions = {
                                    maxItemCount: 1,
                                    changeFeedStartFrom:
                                      ChangeFeedStartFrom.Continuation(
                                        iterResponse.continuationToken
                                      ),
                                  };
                                })
                              )
                            ),
                            O.getOrElse(() => TE.right(void 0))
                          )
                        )
                      ),
                    () =>
                      pipe(defaultLog.taskEither.info("No Results Found"), () =>
                        TE.right(void 0)
                      )
                  )
                )
              ),
              TE.chain(() => delayTaskEither(10))
            )();
          }
        }
      },
      (reason) =>
        new Error(`Impossible to get the change feed: " ${String(reason)}`)
    );
