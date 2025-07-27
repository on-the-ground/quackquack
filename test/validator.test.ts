import { describe, it, expect } from "@jest/globals";
import { core } from "@zod/mini";
import { toZodSchema } from "../src/quack-validator";
const quackParser = require("../src/quack-parser");

describe("zod validator", () => {
  it("throws when input is wrong", () => {
    const quackSignature = `(number?)=>string`;
    const ast = quackParser.parse(quackSignature);
    expect(ast).toStrictEqual({
      type: "function",
      async: false,
      parameters: [
        {
          optional: true,
          type: "number",
        },
      ],
      return: "string",
    });
    const zodSchema = toZodSchema(ast);
    const safeFn = zodSchema.implement((i) => `${i}`);
    try {
      safeFn("10");
    } catch (e) {
      expect(e instanceof core.$ZodError).toBe(true);
    }
  });
});
