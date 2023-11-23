import * as t from "io-ts";
export const readableReport = (errors: t.Errors): string =>
  errors
    .map(
      (e) =>
        `Context=${JSON.stringify(e.context)}|Value=${e.value}|Msg=${e.message}`
    )
    .join("\n");
