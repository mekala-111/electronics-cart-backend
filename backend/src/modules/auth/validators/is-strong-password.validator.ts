import {
  registerDecorator,
  ValidationArguments,
  ValidationOptions,
} from 'class-validator';

const STRONG_PASSWORD_PATTERN =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;

export function IsStrongPassword(validationOptions?: ValidationOptions) {
  return (object: object, propertyName: string) => {
    registerDecorator({
      name: 'isStrongPassword',
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator: {
        validate(value: unknown) {
          return typeof value === 'string' && STRONG_PASSWORD_PATTERN.test(value);
        },
        defaultMessage(args: ValidationArguments) {
          return `${args.property} must be at least 8 characters and include uppercase, lowercase, digit, and special character`;
        },
      },
    });
  };
}
