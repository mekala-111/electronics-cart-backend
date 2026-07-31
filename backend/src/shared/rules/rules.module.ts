import { Global, Module } from '@nestjs/common';
import { ConditionEvaluator } from './ConditionEvaluator';
import { OperatorRegistry } from './OperatorRegistry';
import { RuleEngine } from './RuleEngine';

@Global()
@Module({
  providers: [OperatorRegistry, ConditionEvaluator, RuleEngine],
  exports: [RuleEngine, OperatorRegistry, ConditionEvaluator],
})
export class RulesModule {}
