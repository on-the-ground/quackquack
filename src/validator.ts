import {
  z,
  ZodMiniAny,
  ZodMiniArray,
  ZodMiniBoolean,
  ZodMiniNull,
  ZodMiniNumber,
  ZodMiniPromise,
  ZodMiniString,
  ZodMiniTuple,
  ZodMiniUndefined,
  core,
  ZodMiniVoid,
} from "@zod/mini";

type ParsedType =
  | "number"
  | "string"
  | "boolean"
  | "null"
  | "undefined"
  | "dontcare"
  | "void"
  | ArrayType
  | TupleType
  | PromiseType
  | ObjectType
  | FunctionType;

type ArrayType = {
  type: "array";
  element: ParsedType;
};

type TupleType = {
  type: "tuple";
  elements: ParsedType[];
};

type PromiseType = {
  type: "promise";
  inner: ParsedType;
};

type ObjectType = {
  type: "object";
  properties: Record<
    string,
    {
      optional: boolean;
      type: ParsedType;
    }
  >;
};

type FunctionType = {
  type: "function";
  args: {
    name?: string;
    optional: boolean;
    type: ParsedType;
  }[];
  returnType: ParsedType;
};

function toZodInnerSchema(
  type: ParsedType
):
  | ZodMiniNumber
  | ZodMiniString
  | ZodMiniBoolean
  | ZodMiniNull
  | ZodMiniUndefined
  | ZodMiniAny
  | ZodMiniArray
  | ZodMiniTuple
  | ZodMiniPromise<any>
  | ZodMiniVoid {
  if (typeof type === "string") {
    switch (type) {
      case "number":
        return z.number();
      case "string":
        return z.string();
      case "boolean":
        return z.boolean();
      case "null":
        return z.null();
      case "undefined":
        return z.undefined();
      case "void":
        return z.void();
      case "dontcare":
        return z.any();
      default:
        throw new Error(
          `Unsupported ParsedType for inner schema: ${JSON.stringify(type)}`
        );
    }
  }

  if (type.type === "array") {
    return z.array(toZodInnerSchema(type.element));
  }

  if (type.type === "tuple") {
    return isNonEmpty(type.elements)
      ? z.tuple([
          toZodInnerSchema(type.elements[0]),
          ...type.elements.map(toZodInnerSchema),
        ])
      : z.tuple([]);
  }

  if (type.type === "promise") {
    return z.promise(toZodInnerSchema(type.inner));
  }

  if (type.type === "function") {
    // don't care function parameters
    return z.any();
  }

  throw new Error("todo");
}

export function toZodFunctionSchema(type: FunctionType): core.$ZodFunction {
  const argSchemas = type.args.map((arg) => {
    const base = toZodInnerSchema(arg.type);
    return arg.optional ? z.optional(base) : base;
  });

  const returnSchema = toZodInnerSchema(type.returnType);

  return new core.$ZodFunction({
    type: "function",
    input: isNonEmpty(argSchemas) ? z.tuple(argSchemas) : z.tuple([]),
    output: returnSchema,
  });
}

const isNonEmpty = <T>(arr: T[]): arr is [T, ...T[]] => arr.length > 0;
