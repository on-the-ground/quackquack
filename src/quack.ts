import { FunctionType } from "./quack-validator";
/**
 * Internal symbol used to store the set of roles attached to an object.
 * This property is non-enumerable and hidden from standard inspection.
 */
const QUACK_KEY = Symbol("@on-the-ground/quackquack");
const quackParser = require("./quack-parser");

export type QuackAst = FunctionType;

/**
 * Parses a string representation of a function signature into a QuackAst (intermediate representation).
 *
 * @param fnSig - A string in the format of a function signature, e.g. "(x: number, y: string) => boolean"
 * @returns A QuackAst object representing the parsed function signature.
 */
export function quackAstOf(fnSig: string): QuackAst {
  return quackParser.parse(fnSig);
}

/**
 * Retrieves the QuackAst metadata from a previously marked function.
 *
 * @param fn - A function which may have been decorated or marked with `quackable`.
 * @returns The QuackAst if present, otherwise undefined.
 */
export function quackAstFrom(fn: Function): QuackAst | null {
  try {
    return (fn as any)[QUACK_KEY];
  } catch {
    return null;
  }
}

/**
 * Checks if a function has been marked as quackable (i.e., has QuackAst metadata).
 *
 * @param fn - A function to check.
 * @returns True if the function has a QuackAst attached, false otherwise.
 */
export function isQuackable(fn: Function): boolean {
  return !!quackAstFrom(fn);
}

/**
 * Marks a function or class method with a quackable signature.
 *
 * This allows later validators (like `expectQuack`) to verify that
 * the function is intended to match a specific signature contract at runtime.
 *
 * ### Usage (Function)
 * ```ts
 * const add = quackable("(x: number, y: number) => number")(
 *   (x, y) => x + y
 * );
 * ```
 *
 * ### Usage (Class Method - Legacy Decorator)
 * ```ts
 * class MyClass {
 *   @quackable("(name: string) => void")
 *   greet(name: string) { console.log(name); }
 * }
 * ```
 *
 * ### Usage (Class Method - ECMA 2022 Decorator)
 * ```ts
 * class MyClass {
 *   greet = quackable("(name: string) => void")(function(name: string) {
 *     console.log(name);
 *   });
 * }
 * ```
 *
 * @param sig - The expected function signature in string form.
 * @returns A decorator or a function wrapper that marks the target with QuackAst metadata.
 */
export function quackable<I extends any[], O>(
  sig: string
): (fn: (...args: I) => O) => (...args: I) => O;
export function quackable(sig: string): MethodDecorator;
export function quackable(sig: string): any {
  const qast = quackAstOf(sig);

  return function (...args: any[]) {
    if (isFunction(args)) {
      const fn = args[0];
      (fn as any)[QUACK_KEY] = qast;
      return fn;
    }
    if (isLegacyMethodDecorator(args)) {
      const fn = args[2].value;
      (fn as any)[QUACK_KEY] = qast;
      return;
    }
    if (isECMAMethodDecorator(args)) {
      const fn = args[0];
      (fn as any)[QUACK_KEY] = qast;
      return;
    }
    throw new Error("Invalid usage of quackable");
  };
}

/**
 * Checks if the decorator was applied directly to a function (non-method usage).
 *
 * @param args - Arguments passed to the decorator.
 * @returns True if the decorator is used on a function.
 */
const isFunction = (args: any[]) =>
  args.length === 1 && typeof args[0] === "function";

/**
 * Checks if the decorator was applied as a legacy (TypeScript-style) method decorator.
 *
 * @param args - Arguments passed to the decorator.
 * @returns True if it matches legacy method decorator pattern.
 */
const isLegacyMethodDecorator = (args: any[]) =>
  args.length === 3 &&
  typeof args[2] === "object" &&
  typeof args[2].value === "function";

/**
 * Checks if the decorator was applied using the newer ECMAScript method decorator pattern.
 *
 * @param args - Arguments passed to the decorator.
 * @returns True if it matches ECMA method decorator pattern.
 */
const isECMAMethodDecorator = (args: any[]) =>
  args.length === 2 &&
  typeof args[0] === "function" &&
  typeof args[1] === "object" &&
  typeof args[1].addInitializer === "function";
