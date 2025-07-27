import { quackAstFrom, quackAstOf } from "./quack";
import { type FunctionType, toZodSchema } from "./quack-validator";
const fastDeepEqual = require("fast-deep-equal");

export type QuackDSL = string;

/**
 * Wraps a function with runtime validation based on a given Quack signature.
 *
 * This allows you to enforce that the function matches a specific structure
 * (both syntactically and semantically) based on the Quack DSL. If the function
 * was already annotated via `quackable()`, the signature is checked for compatibility.
 *
 * - If the function is not annotated, the signature is enforced via `zod` wrapper.
 * - If the function is annotated and matches the expected signature, it's either:
 *    - used as-is (`strict = false`)
 *    - or rewrapped with validation (`strict = true`)
 * - If the function is annotated but does not match, an error is thrown.
 *
 * @param expected - A Quack DSL string describing the expected function signature.
 * @param strict - If `true`, wrap the function with runtime validation even if it already matches.
 * @returns A higher-order function that validates or wraps the target function.
 *
 * @example
 * ```ts
 * const greet = expectQuack("(name: string) => void")((name) => console.log(name));
 * greet("Alice"); // valid
 * greet(123);     // throws Zod validation error
 * ```
 */
export const expectQuack =
  (expected: QuackDSL, strict = false) =>
  <Q extends (...args: any[]) => any>(fn: Q): Q => {
    const expectedAst = quackAstOf(expected);
    const actualAst = quackAstFrom(fn);
    if (!actualAst) {
      return withSchemaValidation(fn, expectedAst);
    }
    if (fastDeepEqual(actualAst, expectedAst)) {
      return strict ? withSchemaValidation(fn, expectedAst) : fn;
    }
    throw new Error(
      `Function does not match expected quack.\nExpected: ${expectedAst}\nGot: ${actualAst}`
    );
  };

const withSchemaValidation = <Q extends (...args: any[]) => any>(
  fn: Q,
  expectedAst: FunctionType
): Q =>
  expectedAst.async
    ? (toZodSchema(expectedAst).implementAsync(fn) as Q)
    : (toZodSchema(expectedAst).implement(fn) as Q);

/**
 * Validates or wraps an entire object to ensure that each method matches a declared Quack signature.
 *
 * This is effectively a "duck typing contract enforcement" tool. Each method in the object
 * is validated against its corresponding expected Quack DSL. You can choose whether to rewrap
 * matched functions with runtime validation using the `strict` flag.
 *
 * @param expected - A mapping of method names to expected Quack DSL signatures.
 * @param strict - If `true`, wrap even matching methods with Zod validation.
 * @returns A higher-order function that returns a cloned object with validated/wrapped methods.
 *
 * @example
 * ```ts
 * const duck = expectDuck({
 *   greet: "(name: string) => void",
 *   add: "(x: number, y: number) => number"
 * })({
 *   greet(name) { console.log(name); },
 *   add(x, y) { return x + y; }
 * });
 * ```
 */
export const expectDuck =
  <D extends { [K in string]: QuackDSL }>(expected: D, strict = false) =>
  <O extends { [K in keyof D]: (...args: any[]) => any }>(
    obj: O
  ): { [K in keyof D]: O[K] } => {
    const clone = Object.create(obj);
    const keysOfDuck: Array<keyof D> = Object.keys(expected) as Array<keyof D>;
    for (const key of keysOfDuck) {
      if (!(key in obj) || typeof obj[key] !== "function") {
        throw new Error(`Method ${String(key)} is missing from the object.`);
      }
      clone[key] = expectQuack(expected[key], strict)(obj[key]);
    }
    return clone as { [K in keyof D]: O[K] };
  };
