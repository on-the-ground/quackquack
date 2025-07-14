Start
  = FunctionSignature

FunctionSignature
  = asyncKeyword:"async" _ "(" _ parameters:ParameterList? _ ")" _ "=>" _ returnType:Type {
      return {
        type: "function",
        async: true,
        parameters: parameters || [],
        return: returnType
      };
    }
  / _ "(" _ parameters:ParameterList? _ ")" _ "=>" _ returnType:Type {
      return {
        type: "function",
        async: false,
        parameters: parameters || [],
        return: returnType
      };
    }

ParameterList
  = first:Parameter rest:(_ "," _ Parameter)* {
      return [first, ...rest.map(r => r[3])];
    }

Parameter
  = name:Identifier optional:"?"? _ ":" _ type:Type {
      return {
        optional: optional !== null,
        type
      };
    }

Type
  = TupleType
  / ArrayType
  / FunctionSignature         // nested function
  / PromiseType               // Promise<T>
  / ObjectLiteralType         // inline object
  / PrimitiveType             // number, string, boolean
  / IdentifierType            // custom types → "dontcare"

TupleType
  = "[" _ elements:TypeList? _ "]" {
      return {
        type: "tuple",
        elements: elements || []
      };
    }

TypeList
  = first:Type rest:(_ "," _ Type)* {
      return [first, ...rest.map(r => r[3])];
    }

ArrayType
  = inner:PrimaryType  _ "[]" {
      return {
        type: "array",
        element: inner
      };
    }

PrimaryType
  = FunctionSignature
  / PromiseType
  / ObjectLiteralType
  / PrimitiveType
  / IdentifierType

PrimitiveType
  = "number" { return "number"; }
  / "string" { return "string"; }
  / "boolean" { return "boolean"; }
  / "null"   { return "null"; }
  / "undefined" { return "undefined"; }  
  / "void" { return "void" }

IdentifierType
  = Identifier {
      return "dontcare";
    }

PromiseType
  = "Promise" _ "<" _ inner:Type _ ">" {
      return {
        type: "promise",
        inner
      };
    }

ObjectLiteralType
  = "{" _ body:(!"}" .)* _ "}" {
      return "dontcare";
    }

Identifier
  = $([a-zA-Z_][a-zA-Z0-9_]*)

_ = [ \t\n\r]*
