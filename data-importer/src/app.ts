/* eslint-disable no-console */
import * as TE from "fp-ts/lib/TaskEither";
import * as express from "express";
import * as bodyParser from "body-parser";
import { pipe } from "fp-ts/lib/function";
import { getConfigOrThrow } from "./utils/config";
import {
  cosmosConnect,
  createContainerIfNotExists,
  createDatabaseIfNotExists,
  upsertDocument,
} from "./utils/cosmos";

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export const createApp = async () => {
  const config = getConfigOrThrow();
  const app = express();
  const port = 3000;
  // Parse the incoming request body. This is needed by Passport spid strategy.
  app.use(
    bodyParser.json({
      verify: (_req, res: express.Response, buf, _encoding: BufferEncoding) => {
        // eslint-disable-next-line functional/immutable-data
        res.locals.body = buf;
      },
    })
  );

  console.log(config.COSMOS_ENDPOINT, config.COSMOS_KEY, config.COSMOS_DATABASE, config.COSMOS_CONTAINER);
  const COSMOS_CONTAINER = await pipe(
    cosmosConnect(config.COSMOS_ENDPOINT, config.COSMOS_KEY),
    TE.chain((client) =>
      createDatabaseIfNotExists(client, config.COSMOS_DATABASE)
    ),
    TE.chain((database) =>
      createContainerIfNotExists(database, config.COSMOS_CONTAINER, {
        paths: ["/id"],
      })
    ),
    TE.getOrElse((e) => {
      throw e;
    })
  )();

  // Parse an urlencoded body.
  app.use(bodyParser.urlencoded({ extended: true }));

  app.get("/info", (_: express.Request, res) =>
    res.status(200).json({ status: "OK" })
  );

  app.post("/documents", (req: express.Request, res) =>
    pipe(
      req.body,
      TE.of,
      TE.chain((payload) => upsertDocument(COSMOS_CONTAINER, payload)),
      TE.map(() => res.status(200).json({ status: "OK" })),
      TE.mapLeft((err) => res.status(500).json({ error: String(err) }))
    )()
  );

  app.listen(port, () => {
    // eslint-disable-next-line no-console
    console.log(`Example app listening on port ${port}`);
  });
};

createApp().then(console.log).catch(console.error);
