import { Injectable } from '@nestjs/common';
import { TemplateRepository } from '../repositories/template.repository';

@Injectable()
export class TemplateService {
  constructor(private readonly templateRepository: TemplateRepository) {}

  ping(): { status: 'ok' } {
    return { status: 'ok' };
  }
}
