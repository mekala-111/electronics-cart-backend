import { registerDecorator, ValidationOptions } from 'class-validator';

/** UUID-shaped string (8-4-4-4-12 hex). Accepts seed IDs that are not RFC version 1–5. */
export const UUID_STRING_RE =
  /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

export function IsUuidString(validationOptions?: ValidationOptions) {
  return (object: object, propertyName: string) => {
    registerDecorator({
      name: 'isUuidString',
      target: object.constructor,
      propertyName,
      options: {
        message: `${propertyName} must be a UUID`,
        ...validationOptions,
      },
      validator: {
        validate(value: unknown) {
          return typeof value === 'string' && UUID_STRING_RE.test(value);
        },
      },
    });
  };
}
