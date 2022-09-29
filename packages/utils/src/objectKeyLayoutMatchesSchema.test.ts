import { objectKeyLayoutMatchesSchema } from './objectKeyLayoutMatchesSchema'

const object = {
  this_is: {
    an: 5,
    object: ['abc'],
    with: {
      some: {
        nested: {
          fields: null,
        },
      },
    },
  },
  another: false,
}

test('objectKeyLayoutMatchesSchema', () => {
  expect(objectKeyLayoutMatchesSchema(object, ['this_is'])).toBe(true)
  expect(objectKeyLayoutMatchesSchema(object, ['this_is', 'another'])).toBe(
    true
  )
  expect(objectKeyLayoutMatchesSchema(object, ['this_is', 'false'])).toBe(false)

  expect(
    objectKeyLayoutMatchesSchema(object, {
      _: {
        this_is: {},
      },
    })
  ).toBe(true)
  expect(
    objectKeyLayoutMatchesSchema(object, {
      _: {
        this_is: {},
        a_missing_field: {},
      },
    })
  ).toBe(false)
  expect(
    objectKeyLayoutMatchesSchema(object, {
      _: {
        this_is: {},
      },
      exact: false,
    })
  ).toBe(true)
  expect(
    objectKeyLayoutMatchesSchema(object, {
      _: {
        this_is: {},
      },
      exact: true,
    })
  ).toBe(false)
  expect(
    objectKeyLayoutMatchesSchema(object, {
      _: {
        this_is: {},
        another: {},
      },
      exact: true,
    })
  ).toBe(true)

  expect(
    objectKeyLayoutMatchesSchema(object, {
      _: {
        this_is: ['an', 'object'],
      },
    })
  ).toBe(true)
  expect(
    objectKeyLayoutMatchesSchema(object, {
      _: {
        this_is: ['an', 'object', 'with_a_missing_field'],
      },
    })
  ).toBe(false)
  expect(
    objectKeyLayoutMatchesSchema(object, {
      _: {
        this_is: ['an', 'object'],
      },
      exact: false,
    })
  ).toBe(true)
  expect(
    objectKeyLayoutMatchesSchema(object, {
      _: {
        this_is: ['an', 'object'],
      },
      exact: true,
    })
  ).toBe(false)
  expect(
    objectKeyLayoutMatchesSchema(object, {
      _: {
        this_is: ['an', 'object', 'with'],
      },
      exact: true,
    })
  ).toBe(false)

  expect(
    objectKeyLayoutMatchesSchema(object, {
      _: {
        this_is: {
          _: {
            an: {},
            object: {},
          },
        },
      },
    })
  ).toBe(true)
  expect(
    objectKeyLayoutMatchesSchema(object, {
      _: {
        this_is: {
          _: {
            an: {},
            object: {},
            with_a_missing_field: {},
          },
        },
      },
    })
  ).toBe(false)
  expect(
    objectKeyLayoutMatchesSchema(object, {
      _: {
        this_is: {
          _: {
            an: {},
            object: {},
          },
          exact: true,
        },
      },
    })
  ).toBe(false)
  expect(
    objectKeyLayoutMatchesSchema(object, {
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
    })
  ).toBe(true)

  expect(
    objectKeyLayoutMatchesSchema(object, {
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
                        fields: {},
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    })
  ).toBe(true)
  expect(
    objectKeyLayoutMatchesSchema(object, {
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
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    })
  ).toBe(false)
})
