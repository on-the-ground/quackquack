import * as zm from "@zod/mini";

/**
 * Internal symbol used to store the set of roles attached to an object.
 * This property is non-enumerable and hidden from standard inspection.
 */
const ROLES_KEY = Symbol("@on-the-ground/quackquack/roles");

/**
 * A Protocol defines the structure of a Role.
 * It must be an object whose values are all functions.
 */
export type Protocol = Record<string, (...args: any[]) => any>;

/**
 * A Role represents a named capability defined by a guard function.
 * The role must only include methods (function-valued properties).
 *
 * @template P The protocol type of the role.
 */
export type Role<P extends Protocol> = {
  /** A unique symbol identifying the role. */
  symbol: symbol;
  /**
   * A type guard function that checks whether a given object satisfies the role.
   * Should only return true for objects whose shape matches the protocol.
   */
  guard: (obj: any) => obj is P;
};

/**
 * Creates a new Role.
 * Ensures that any object claimed to match the role only contains methods.
 *
 * @template P The protocol type of the role.
 * @param description A human-readable description used as the role's symbol.
 * @param guard A type guard that determines whether an object implements the role.
 * @returns A new Role object.
 * @throws If the guard returns true for an object that contains non-function values.
 */
export function newRole<P extends Protocol>(
  description: string,
  guard: (obj: any) => obj is P
): Role<P> {
  const test = {} as any;
  if (guard(test)) {
    for (const [k, v] of Object.entries(test)) {
      if (typeof v !== "function") {
        throw new Error(
          `Role "${description}" must only contain methods. Key "${k}" is not a function.`
        );
      }
    }
  }

  return {
    symbol: Symbol(description),
    guard,
  };
}

/**
 * Internal marker interface for objects that store attached role symbols.
 */
type HasRolesKey = {
  [ROLES_KEY]: Set<symbol>;
};

/**
 * A RoleAware object tracks which roles it implements and exposes helpers.
 */
export type RoleAware = HasRolesKey & {
  /**
   * Attaches a role to the object if it satisfies the role's guard.
   * This is used internally to mark the object as having the role.
   */
  attachRole: <P extends Protocol, O extends RoleAware>(
    role: Role<P>
  ) => (O & P) | O;

  /**
   * Checks whether the object implements the given role.
   * Returns the object typed as that role if so, otherwise null.
   */
  implementsRole: <P extends Protocol>(role: Role<P>) => P | null;
};

/**
 * Creates a RoleAware version of the given object.
 * This clones the object and adds internal role tracking metadata.
 *
 * @param obj The original object to wrap.
 * @returns A new object with RoleAware capabilities.
 */
export function roleAwarableOf<O extends object>(obj: O): O & RoleAware {
  const cloned = Object.create(obj);

  if (!cloned[ROLES_KEY]) {
    Object.defineProperty(cloned, ROLES_KEY, {
      value: new Set<symbol>(),
      enumerable: false,
    });
  }

  Object.defineProperties(cloned, {
    attachRole: {
      value: <P extends Protocol, O extends RoleAware>(
        role: Role<P>
      ): (O & P) | O => attachRole(role, cloned),
      enumerable: false,
    },
    implementsRole: {
      value: <P extends Protocol>(role: Role<P>): P | null =>
        isRole(role, cloned) ? (cloned as P) : null,
      enumerable: false,
    },
  });

  return cloned as O & RoleAware;
}

/**
 * Attaches a role to an object if it passes the guard check.
 * Adds the role's symbol to the internal role registry.
 *
 * @internal
 * @param role The role to attach.
 * @param obj The object to attach the role to.
 * @returns The object typed as implementing the role if successful.
 */
function attachRole<P extends Protocol, O extends HasRolesKey>(
  role: Role<P>,
  obj: O
): (O & P) | O {
  if (!role.guard(obj)) {
    return obj;
  }
  obj[ROLES_KEY].add(role.symbol);
  return obj as O & P;
}

/**
 * Checks if a given object has previously attached the specified role.
 *
 * @param role The role to check.
 * @param obj The object to test.
 * @returns True if the role symbol is attached.
 */
function isRole<P extends Protocol>(role: Role<P>, obj: any): obj is P {
  return Boolean((obj as any)?.[ROLES_KEY]?.has?.(role.symbol));
}

/**
 * Ensures that a RoleAware object implements the given role.
 * Throws an error if the role is not implemented.
 *
 * @template P The protocol type of the role.
 * @param obj The RoleAware object to validate.
 * @param role The required role.
 * @returns The object typed as the role.
 * @throws If the object does not implement the role.
 */
export function ensureImplements<P extends Protocol>(
  obj: RoleAware,
  role: Role<P>
): P {
  const impl = obj.implementsRole(role);
  if (impl) return impl;
  throw new Error(
    `Object does not implement required role: ${
      role.symbol.description ?? "unknown"
    }`
  );
}
