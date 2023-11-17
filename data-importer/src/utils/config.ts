/**
 * Config module
 *
 * Single point of access for the application confguration. Handles validation on required environment variables.
 * The configuration is evaluate eagerly at the first access to the module. The module exposes convenient methods to access such value.
 */

import * as t from "io-ts";

import * as E from "fp-ts/lib/Either";
import { pipe } from "fp-ts/lib/function";
import { NonEmptyString } from "@pagopa/ts-commons/lib/strings";
import { readableReport } from "./logging";

// global app configuration
export type IConfig = t.TypeOf<typeof IConfig>;
export const IConfig = t.type({
  COSMOS_CONTAINER: NonEmptyString,
  COSMOS_DATABASE: NonEmptyString,
  COSMOS_ENDPOINT: NonEmptyString,
  COSMOS_KEY: NonEmptyString,
  isProduction: t.boolean,
});

// No need to re-evaluate this object for each call
const errorOrConfig: t.Validation<IConfig> = IConfig.decode({
  ...process.env,
  isProduction: process.env.NODE_ENV === "production",
});

/**
 * Read the application configuration and check for invalid values.
 * Configuration is eagerly evalued when the application starts.
 *
 * @returns either the configuration values or a list of validation errors
 */
export const getConfig = (): t.Validation<IConfig> => errorOrConfig;

/**
 * Read the application configuration and check for invalid values.
 * If the application is not valid, raises an exception.
 *
 * @returns the configuration values
 * @throws validation errors found while parsing the application configuration
 */
export const getConfigOrThrow = (): IConfig =>
  pipe(
    errorOrConfig,
    E.getOrElse((errors) => {
      throw new Error(`Invalid configuration: ${readableReport(errors)}`);
    })
  );
