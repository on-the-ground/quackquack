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
  ZodMiniVoid,
  ZodMiniOptional,
  core,
} from "@zod/mini";

// --- Ast 타입 정의 ---
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
  | FunctionType;

type ArrayType = { type: "array"; element: ParsedType };
type TupleType = { type: "tuple"; elements: ParsedType[] };
type PromiseType = { type: "promise"; inner: ParsedType };

type ParameterType = {
  optional: boolean;
  type: ParsedType;
};

export type FunctionType = {
  type: "function";
  async: boolean;
  parameters: ParameterType[];
  return: ParsedType;
};

// --- Zod mini 확장 타입 ---
type BaseZodSchema =
  | ZodMiniNumber
  | ZodMiniString
  | ZodMiniBoolean
  | ZodMiniNull
  | ZodMiniUndefined
  | ZodMiniAny
  | ZodMiniArray
  | ZodMiniTuple
  | ZodMiniPromise<any>
  | ZodMiniVoid;

type ExtendedZodSchema = BaseZodSchema | ZodMiniOptional<BaseZodSchema>;

// --- 유틸 ---
const isNonEmpty = <T>(arr: T[]): arr is [T, ...T[]] => arr.length > 0;

const sanitizeOptionalParams = <T extends readonly ParameterType[]>(
  ps: T
): T => {
  let foundOptional = false;
  for (let i = ps.length - 1; i >= 0; i--) {
    if (!ps[i].optional && foundOptional) {
      throw new Error(`Required parameter '${i}' cannot follow optional ones`);
    }
    if (ps[i].optional) foundOptional = true;
  }
  return ps;
};

// --- 파서: Ast → Zod ---
function toZodInnerSchema(type: ParsedType): BaseZodSchema {
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
        throw new Error(`Unknown primitive type: ${type}`);
    }
  }

  switch (type.type) {
    case "array":
      return z.array(toZodInnerSchema(type.element));
    case "tuple":
      return isNonEmpty(type.elements)
        ? z.tuple(
            type.elements.map(
              toZodInnerSchema
            ) as NonEmptyArr<ExtendedZodSchema>
          )
        : z.tuple([]);
    case "promise":
      return z.promise(toZodInnerSchema(type.inner));
    case "function":
      return z.any(); // nested 함수 시그니처는 지원 안 함
  }

  throw new Error(`Unmatched ParsedType: ${JSON.stringify(type)}`);
}

// --- param schema ---
const paramSchemaOf = (paramAst: ParameterType): ExtendedZodSchema => {
  const base = toZodInnerSchema(paramAst.type);
  return paramAst.optional ? z.optional(base) : base;
};

export const paramSchemasOf = <T extends readonly ParameterType[]>(
  paramAsts: T
): z.ZodMiniTuple<{
  [K in keyof T]: T[K] extends { optional: true }
    ? z.ZodMiniOptional<BaseZodSchema>
    : BaseZodSchema;
}> => {
  const safeParms = sanitizeOptionalParams(paramAsts);
  return z.tuple(safeParms.map(paramSchemaOf) as any);
};

export const returnSchemaOf = toZodInnerSchema;

// --- 최종 함수 schema 생성 ---
export function toZodSchema(quackAst: FunctionType): core.$ZodFunction {
  return new core.$ZodFunction({
    type: "function",
    input: paramSchemasOf(quackAst.parameters),
    output: returnSchemaOf(quackAst.return),
  });
}

type NonEmptyArr<T> = [T, ...T[]];
