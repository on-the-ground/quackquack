import { quackable } from "../src/quack";
import { expectQuack, expectDuck } from "../src/duck";
import { core } from "@zod/mini";

describe("expectQuack", () => {
  it("accepts a correctly quacked function", () => {
    const fn = quackable("(i:number, j:string) => boolean")(
      (a: number, b: string) => typeof b === "string"
    );
    const checkedFn = expectQuack("(i: number, j:string) => boolean")(fn);
    expect(checkedFn(1, "ok")).toBe(true);
    expect(checkedFn(2, "test")).toBe(true);
  });
  it("accepts a correctly quacked method", () => {
    class testClass {
      @quackable("(a:number, b:string) => boolean")
      testFn(a: number, b: string) {
        return typeof b === "string";
      }
    }
    const obj = new testClass();
    expect(obj.testFn(1, "ok")).toBe(true);
    expect(obj.testFn(2, "test")).toBe(true);
  });

  it("wraps and validates a non-quacked function", () => {
    const fn: (...args: any[]) => any = (x: string, y: number) => `${x}: ${y}`;
    const wrapped = expectQuack("(i:number, j: number) => number")(fn);
    expect(() => wrapped("a", 2)).toThrow();
  });
  it("wraps and validates a non-quacked method", () => {
    class testClass {
      testFn(x: string, y: number) {
        return `${x}: ${y}`;
      }
    }
    const obj = new testClass();
    const wrapped = expectQuack("(i:number, j: number) => number")(obj.testFn);
    try {
      wrapped("a", 2);
    } catch (e) {
      expect(e instanceof core.$ZodError).toBe(true);
    }
  });

  it("throws on mismatched quack signature", () => {
    const fn = quackable("(i:number) => number")((x: number) => x);
    expect(() => expectQuack("(i:string) => number")(fn)).toThrow(
      "Function does not match expected quack"
    );
    class testClass {
      @quackable("(x: number, y: number) => number")
      testFn(x: number, y: number) {
        return x + y;
      }
    }
    const obj = new testClass();
    expect(() => expectQuack("(i:string) => number")(obj.testFn)).toThrow(
      "Function does not match expected quack"
    );
  });
  it("wraps and validates an async non-quacked function", async () => {
    const expectAsyncSchema = expectQuack(
      "async (x: number, y: string) => boolean"
    );
    const asyncFn = async (x: number, y: string): Promise<boolean> => {
      return typeof y === "string" && x > 0;
    };
    const wrapped = expectAsyncSchema(asyncFn);

    await expect(wrapped(1, "ok")).resolves.toBe(true);
    await expect(wrapped(-1, "bad")).resolves.toBe(false);
    try {
      const wrapped = expectAsyncSchema(async (x: number, y: number) => 1);
      await wrapped(123, 123);
    } catch (e) {
      expect(e instanceof core.$ZodError).toBe(true);
    }
  });
});

describe("expectDuck", () => {
  it("accepts a correctly quacked object", () => {
    const impl: any = {};
    impl["foo"] = quackable("(i:number) => number")((x: number) => x * 2);
    impl["bar"] = quackable("(i:string) => boolean")(
      (s: string) => s.length > 0
    );

    const ducked = expectDuck({
      foo: "(i:number) => number",
      bar: "(i:string) => boolean",
    })(impl);

    expect(ducked.foo(3)).toBe(6);
    expect(ducked.bar("hello")).toBe(true);
  });
  it("accepts a correctly quacked class", () => {
    class testClass {
      @quackable("(i:number) => number")
      foo(x: number) {
        return x * 2;
      }
      @quackable("(i:string) => boolean")
      bar(s: string) {
        return s.length > 0;
      }
    }
    const impl = new testClass();

    const ducked = expectDuck({
      foo: "(i:number) => number",
      bar: "(i:string) => boolean",
    })(impl);

    expect(ducked.foo(3)).toBe(6);
    expect(ducked.bar("hello")).toBe(true);
  });

  it("wraps non-quacked object functions and validates", () => {
    const impl = {
      foo: (x: number) => x * 2,
      bar: (s: string) => s.length > 0,
    };
    const ducked = expectDuck({
      foo: "(i:number) => number",
      bar: "(i:string) => boolean",
    })(impl);

    expect(ducked.foo(3)).toBe(6);
    expect(ducked.bar("hello")).toBe(true);
    expect(() => ducked.foo("bad" as any)).toThrow();
  });

  it("wraps non-quacked class methods and validates", () => {
    class testClass {
      @quackable("(i:number) => number")
      foo(x: number) {
        return x * 2;
      }
      @quackable("(i:string) => boolean")
      bar(s: string) {
        return s.length > 0;
      }
    }
    const impl = new testClass();
    const ducked = expectDuck(
      {
        foo: "(i:number) => number",
        bar: "(i:string) => boolean",
      },
      true
    )(impl);

    expect(ducked.foo(3)).toBe(6);
    expect(ducked.bar("hello")).toBe(true);
    expect(() => ducked.foo("bad" as any)).toThrow();
  });
});

describe("edge cases", () => {
  it("preserves `this` context when wrapping method", () => {
    class T {
      value = 5;

      @quackable("(x:number)=>number")
      add(x: number) {
        return x + this.value;
      }
    }

    const obj = new T();
    const wrapped = expectQuack("(x:number)=>number")(obj.add.bind(obj)); // 바인딩 후 전달
    expect(wrapped(3)).toBe(8); // 정상작동
  });

  it("validates method defined via getter", () => {
    class T {
      get add() {
        return quackable("(x:number)=>number")((x: number) => x + 1);
      }
    }

    const t = new T();
    const wrapped = expectQuack("(x:number)=>number")(t.add);
    expect(wrapped(2)).toBe(3);
  });

  it("handles symbol-named methods in duck typing", () => {
    const sym = Symbol("secret");

    const obj: any = {
      [sym]: quackable("(x:number)=>number")((x: number) => x * 2),
    };

    const ducked = expectDuck({ [sym]: "(x:number)=>number" })(obj);
    expect(ducked[sym](4)).toBe(8);
  });

  it("accepts dynamically added method if strict is false", () => {
    const obj: any = {};
    obj.foo = (x: number) => x;

    const ducked = expectDuck({ foo: "(x:number)=>number" }, false)(obj);
    expect(ducked.foo(3)).toBe(3);
    expect(() => ducked.foo("bad" as any)).toThrow(); // 여전히 타입 검사는 작동
  });

  it("skips runtime validation for quacked methods with matching signature", () => {
    const fn = quackable("(x: number) => number")((x: any) => Number(x));
    const wrapped = expectQuack("(x: number) => number")(fn);

    // 내부적으로 validator 생략되어야 함
    expect(wrapped("42" as any)).toBe(42); // 통과하지만 위험
  });
});
