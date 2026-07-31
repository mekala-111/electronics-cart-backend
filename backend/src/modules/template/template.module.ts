import { Module } from '@nestjs/common';
import { PrismaModule } from '../../database/prisma.module';
import { TemplateController } from './controllers/template.controller';
import { TemplateRepository } from './repositories/template.repository';
import { TemplateService } from './services/template.service';

@Module({
  imports: [PrismaModule],
  controllers: [TemplateController],
  providers: [TemplateService, TemplateRepository],
  exports: [TemplateService, TemplateRepository],
})
export class TemplateModule {}
