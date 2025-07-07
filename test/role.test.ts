import { describe, it, expect } from "vitest";
import {
  newRole,
  roleAwarableOf,
  ensureImplements,
  type Protocol,
  type RoleAware,
} from "../src/role";

describe("role system", () => {
  const Greeter = newRole(
    "Greeter",
    (obj: any): obj is { greet: () => string } =>
      typeof obj.greet === "function"
  );

  const Logger = newRole(
    "Logger",
    (obj: any): obj is { log: (msg: string) => void } =>
      typeof obj.log === "function"
  );

  it("should attach a role and detect implementation", () => {
    const user = {
      greet() {
        return "Hello!";
      },
    };

    const aware = roleAwarableOf(user);
    const after = aware.attachRole(Greeter);

    const impl = after.implementsRole(Greeter);
    expect(impl).not.toBeNull();
    expect(impl?.greet()).toBe("Hello!");
  });

  it("should not attach a role if the guard fails", () => {
    const user = {
      name: "Alice",
    };

    const aware = roleAwarableOf(user);
    const after = aware.attachRole(Greeter);

    const impl = after.implementsRole(Greeter);
    expect(impl).toBeNull();
  });

  it("should throw if required role is not implemented", () => {
    const user = {
      greet() {
        return "Yo!";
      },
    };

    const aware = roleAwarableOf(user);
    aware.attachRole(Greeter);

    expect(() => ensureImplements(aware, Logger)).toThrowError(
      /does not implement required role/i
    );
  });

  it("should pass if required role is implemented", () => {
    const consoleLogger = {
      log(msg: string) {
        console.log(msg);
      },
    };

    const aware = roleAwarableOf(consoleLogger).attachRole(Logger);
    const logger = ensureImplements(aware, Logger);

    expect(logger).toHaveProperty("log");
    expect(typeof logger.log).toBe("function");
  });
});
