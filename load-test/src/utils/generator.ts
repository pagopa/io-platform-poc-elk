import {
  FiscalCode,
} from "@pagopa/ts-commons/lib/strings";


export const randomString = (length: number, charset: string) => {
  let res = "";
  while (length--) res += charset[(Math.random() * charset.length) | 0];
  return res;
};

export const generateFakeFiscalCode = (decade: string): FiscalCode => {
  const s = randomString(6, "ABCDEFGHIJKLMNOPQRSTUVWXYZ");
  const d = randomString(7, "0123456789");
  return [s, decade, d[1], "A", d[2], d[3], "Y", d[4], d[5], d[6], "X"].join(
    ""
  ) as FiscalCode;
};

export const generateMessageId = () =>
  randomString(12, "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789");

export const generateDocument = () => ({
  id: generateMessageId(),
  fiscalCode: generateFakeFiscalCode("8")
})