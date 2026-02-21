import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AppService } from './app.service';

@ApiTags('Health')
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  @ApiOperation({ summary: 'Health check' })
  @ApiResponse({
    status: 200,
    description: 'API is up and running',
    schema: {
      example: {
        status: 'ok',
        uptime: 123.45,
        timestamp: '2026-02-21T00:00:00.000Z',
        version: '1.0',
        environment: 'development',
      },
    },
  })
  getHealth() {
    return this.appService.getHealth();
  }
}
