export interface ElasticDocument {
  readonly id: string;
  readonly [key: string]: unknown;
}
