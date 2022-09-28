import assert from "assert";

// Passing just a string array uses `exact` as undefined or false.
type ObjectMatchSchema =
  | string[]
  | {
      // Shape of expected object with nested schema.
      _: Record<string, ObjectMatchSchema | { [key: string | number | symbol]: never }>;
      // If true, the shape keys must exactly match the object keys—no more, no less.
      exact?: boolean;
    };

// Check if object has the expected fields.
export const objectKeyLayoutMatchesSchema = (
  object: Record<string, unknown> | undefined | null,
  schema: ObjectMatchSchema
): boolean => {
  if (!object) {
    return false;
  }

  const objectKeys = new Set(Object.keys(object));

  // If passed string array, simply check presence of keys.
  if (Array.isArray(schema)) {
    return schema.every((key) => objectKeys.has(key));
  }

  // If we proceed past this block, keys match and we should recurse on
  // available schema children.
  const schemaEntries = Object.entries(schema._);
  const keysMatch =
    schemaEntries.every(([key]) => objectKeys.has(key)) &&
    // If exact is set, verify number of entries equals the expected.
    (!schema.exact || schemaEntries.length === objectKeys.size);
  if (!keysMatch) {
    return false;
  }

  return schemaEntries.every(
    ([child, schema]) =>
      // If schema is empty object ({}), nothing further to check. We already
      // verified its presence above.
      (!Array.isArray(schema) && Object.keys(schema).length === 0) ||
      // Recurse, first verifying the value of the key in the object is an
      // object.
      (typeof object[child] === "object" &&
        !Array.isArray(object[child]) &&
        // typeof null === 'object', so verify this is not null before checking
        // its internal keys.
        object[child] !== null &&
        objectKeyLayoutMatchesSchema(
          object[child] as Record<string, unknown>,
          schema as ObjectMatchSchema
        ))
  );
};

//! TESTS
// npx ts-node ./objectKeyLayoutMatchesSchema.ts

const object = {
  this_is: {
    an: 5,
    object: ['abc'],
    with: {
      some: {
        nested: {
          fields: null
        }
      }
    }
  },
  another: false,
};

assert(objectKeyLayoutMatchesSchema(object, ['this_is']) === true);
assert(objectKeyLayoutMatchesSchema(object, ['this_is', 'another']) === true);
assert(objectKeyLayoutMatchesSchema(object, ['this_is', 'false']) === false);

assert(objectKeyLayoutMatchesSchema(object, {
  _: {
    this_is: {},
  },
}) === true);
assert(objectKeyLayoutMatchesSchema(object, {
  _: {
    this_is: {},
    a_missing_field: {},
  },
}) === false);
assert(objectKeyLayoutMatchesSchema(object, {
  _: {
    this_is: {},
  },
  exact: false,
}) === true);
assert(objectKeyLayoutMatchesSchema(object, {
  _: {
    this_is: {},
  },
  exact: true,
}) === false);
assert(objectKeyLayoutMatchesSchema(object, {
  _: {
    this_is: {},
    another: {},
  },
  exact: true,
}) === true);

assert(objectKeyLayoutMatchesSchema(object, {
  _: {
    this_is: ['an', 'object'],
  },
}) === true);
assert(objectKeyLayoutMatchesSchema(object, {
  _: {
    this_is: ['an', 'object', 'with_a_missing_field'],
  },
}) === false);
assert(objectKeyLayoutMatchesSchema(object, {
  _: {
    this_is: ['an', 'object'],
  },
  exact: false
}) === true);
assert(objectKeyLayoutMatchesSchema(object, {
  _: {
    this_is: ['an', 'object'],
  },
  exact: true
}) === false);
assert(objectKeyLayoutMatchesSchema(object, {
  _: {
    this_is: ['an', 'object', 'with'],
  },
  exact: true
}) === false);

assert(objectKeyLayoutMatchesSchema(object, {
  _: {
    this_is: {
      _: {
        an: {},
        object: {},
      },
    },
  },
}) === true);
assert(objectKeyLayoutMatchesSchema(object, {
  _: {
    this_is: {
      _: {
        an: {},
        object: {},
        with_a_missing_field: {},
      },
    },
  },
}) === false);
assert(objectKeyLayoutMatchesSchema(object, {
  _: {
    this_is: {
      _: {
        an: {},
        object: {},
      },
      exact: true,
    },
  },
}) === false);
assert(objectKeyLayoutMatchesSchema(object, {
  _: {
    this_is: {
      _: {
        an: {},
        object: {},
        with: {},
      },
      exact: true,
    },
  },
}) === true);

assert(objectKeyLayoutMatchesSchema(object, {
  _: {
    this_is: {
      _: {
        an: {},
        object: {},
        with: {
          _: {
            some: {
              _: {
                nested: {
                  _: {
                    fields: {}
                  }
                }
              }
            }
          }
        },
      },
    },
  },
}) === true);
assert(objectKeyLayoutMatchesSchema(object, {
  _: {
    this_is: {
      _: {
        an: {},
        object: {},
        with: {
          _: {
            some: {
              _: {
                nested: {
                  _: {
                    fields: {
                      _: {
                        but_actually_too_many: {},
                      }
                    }
                  }
                }
              }
            }
          }
        },
      },
    },
  },
}) === false);
