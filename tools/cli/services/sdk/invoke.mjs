import {
  flattenTokens,
  parseArg,
  peelTrailingJsonArgs,
} from './parse-value.mjs';

export class SdkPathError extends Error {
  /**
   * @param {string} message
   */
  constructor(message) {
    super(message);
    this.name = 'SdkPathError';
  }
}

/**
 * Walk the SDK object tree and invoke the terminal method.
 *
 * Path tokens mirror the SDK surface: properties are plain segments, intermediate
 * methods consume the next token as their sole argument, and the final method
 * receives any remaining tokens plus optional JSON/stdin args.
 *
 * @example
 * // sdk.blueprints.entitiesOf("todo").getList()
 * invokeSdk(sdk, ['blueprints', 'entitiesOf', 'todo', 'getList'])
 *
 * @example
 * // sdk.blueprints.entitiesOf("todo").create({ title: "Buy milk" })
 * invokeSdk(sdk, ['blueprints', 'entitiesOf', 'todo', 'create', '{"title":"Buy milk"}'])
 *
 * @param {object} sdk
 * @param {string[]} rawTokens
 * @param {unknown[]} [extraArgs]
 * @returns {Promise<unknown>}
 */
export async function invokeSdk(sdk, rawTokens, extraArgs = []) {
  const tokens = flattenTokens(rawTokens);
  const jsonArgs = peelTrailingJsonArgs(tokens);
  const callArgs = [...jsonArgs, ...extraArgs];

  if (tokens.length === 0) {
    throw new SdkPathError('Provide an SDK path, e.g. `qelos sdk blueprints getList`');
  }

  let current = sdk;
  let index = 0;

  while (index < tokens.length) {
    const key = tokens[index];
    const member = current?.[key];

    if (member === undefined) {
      throw new SdkPathError(`Unknown SDK member "${key}"`);
    }

    if (typeof member !== 'function') {
      current = member;
      index += 1;
      continue;
    }

    const bound = member.bind(current);

    if (index === tokens.length - 1) {
      return await bound(...callArgs);
    }

    if (index + 2 >= tokens.length) {
      const methodArgs = tokens.slice(index + 1).map(parseArg).concat(callArgs);
      return await bound(...methodArgs);
    }

    const arg = parseArg(tokens[index + 1]);
    const result = await bound(arg);
    const nextKey = tokens[index + 2];

    if (result != null && nextKey in Object(result)) {
      current = result;
      index += 2;
      continue;
    }

    const methodArgs = tokens.slice(index + 1).map(parseArg).concat(callArgs);
    return await bound(...methodArgs);
  }

  throw new SdkPathError('SDK path must end in a method call');
}
