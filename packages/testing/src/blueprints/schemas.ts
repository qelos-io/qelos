/**
 * The custom `schema` of an `object` property is checked with `ajv`, as the data service does, when the app has it
 * installed.
 */

/** whether a value suits a schema; throws for a schema `ajv` refuses */
export type SchemaCheck = (schema: object, value: unknown) => boolean;

/** a name TypeScript does not resolve: the package is optional */
const PACKAGE: string = 'ajv';

/** Loads `ajv` once, when first needed. Without version 8 of it, warns once and answers undefined. */
export function createSchemaLoader(warn: (message: string) => void, load: () => Promise<any> = () => import(PACKAGE)) {
  let loading: Promise<SchemaCheck | undefined> | undefined;
  return () =>
    (loading ??= (async () => {
      try {
        const loaded = await load();
        // version 8 names its class; older ones export only the function itself
        const Ajv = loaded.Ajv ?? loaded.default?.Ajv;
        if (!Ajv) throw new Error('an older version of "ajv" was found, version 8 is needed.');
        const ajv = new Ajv();
        return (schema: object, value: unknown) => !!ajv.compile(schema)(value);
      } catch (e: any) {
        warn(
          `[qelos-testing] a custom "schema" of an object property is only checked for its type: full checking needs ` +
            `the optional "ajv" package (npm install --save-dev ajv@8). ${String(e?.message ?? e).split('\n')[0]}`,
        );
        return undefined;
      }
    })());
}
