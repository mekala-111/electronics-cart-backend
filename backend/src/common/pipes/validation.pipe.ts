import { ValidationPipe, ValidationPipeOptions } from '@nestjs/common';

const DEFAULT_VALIDATION_OPTIONS: ValidationPipeOptions = {
  whitelist: true,
  forbidNonWhitelisted: true,
  transform: true,
  transformOptions: {
    enableImplicitConversion: true,
  },
};

export function createValidationPipe(
  overrides: ValidationPipeOptions = {},
): ValidationPipe {
  return new ValidationPipe({
    ...DEFAULT_VALIDATION_OPTIONS,
    ...overrides,
  });
}
