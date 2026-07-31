import {
  registerDecorator,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';

@ValidatorConstraint({ name: 'isPositiveQty', async: false })
export class IsPositiveQtyConstraint implements ValidatorConstraintInterface {
  validate(value: unknown): boolean {
    return typeof value === 'number' && Number.isInteger(value) && value > 0;
  }
  defaultMessage(): string {
    return 'quantity must be a positive integer';
  }
}

export function IsPositiveQty(options?: ValidationOptions) {
  return (object: object, propertyName: string) => {
    registerDecorator({
      target: object.constructor,
      propertyName,
      options,
      constraints: [],
      validator: IsPositiveQtyConstraint,
    });
  };
}
