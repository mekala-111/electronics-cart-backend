import { Body, Controller, Get, Post } from '@nestjs/common';
import { Public } from '../../../common/decorators/public.decorator';
import { Idempotent } from '../../../shared/idempotency/idempotent.decorator';
import { PingResponseDto } from '../dto/ping-response.dto';
import { TemplateService } from '../services/template.service';

@Controller('template')
export class TemplateController {
  constructor(private readonly templateService: TemplateService) {}

  @Public()
  @Get('ping')
  ping(): PingResponseDto {
    return this.templateService.ping();
  }

  /** Demo write endpoint for Idempotency-Key retries (Catalog+ will use the same decorator). */
  @Public()
  @Idempotent()
  @Post('echo')
  echo(@Body() body: Record<string, unknown>): { echoed: Record<string, unknown> } {
    return { echoed: body ?? {} };
  }
}
