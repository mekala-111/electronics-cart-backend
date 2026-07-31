import { Injectable } from '@nestjs/common';
import type { OperatorName, RuleOperator } from './types/rule.types';
import { DEFAULT_OPERATORS } from './operators/operators';

@Injectable()
export class OperatorRegistry {
  private readonly map = new Map<OperatorName, RuleOperator>();

  constructor() {
    for (const op of DEFAULT_OPERATORS) {
      this.register(op);
    }
  }

  register(op: RuleOperator): void {
    this.map.set(op.name, op);
  }

  get(name: string): RuleOperator | undefined {
    return this.map.get(name as OperatorName);
  }

  has(name: string): boolean {
    return this.map.has(name as OperatorName);
  }

  list(): OperatorName[] {
    return [...this.map.keys()];
  }
}
