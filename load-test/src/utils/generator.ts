import { FiscalCode } from "@pagopa/ts-commons/lib/strings";

export const randomString = (length: number, charset: string): string => {
  // eslint-disable-next-line functional/no-let
  let res = "";
  // eslint-disable-next-line no-param-reassign
  while (length--) {
    // eslint-disable-next-line no-bitwise
    res += charset[(Math.random() * charset.length) | 0];
  }
  return res;
};

export const generateFakeFiscalCode = (decade: string): FiscalCode => {
  const s = randomString(6, "ABCDEFGHIJKLMNOPQRSTUVWXYZ");
  const d = randomString(7, "0123456789");
  return [s, decade, d[1], "A", d[2], d[3], "Y", d[4], d[5], d[6], "X"].join(
    ""
  ) as FiscalCode;
};

export const generateMessageId = (): string =>
  randomString(12, "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789");

export const generateDocument = (): {
  readonly fiscalCode: string;
  readonly id: string;
} => ({
  fiscalCode: generateFakeFiscalCode("8"),
  id: generateMessageId()
});
