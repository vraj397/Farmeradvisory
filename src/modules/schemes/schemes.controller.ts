import { Controller, Get, Param, ParseIntPipe, Query } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { SchemesService } from './schemes.service';

@ApiTags('Government Schemes')
@Controller('schemes')
export class SchemesController {
  constructor(private readonly schemesService: SchemesService) {}

  @Get()
  @ApiOperation({ summary: 'Get list of government agricultural schemes with optional state and crop filtering' })
  @ApiQuery({ name: 'state', required: false, type: String })
  @ApiQuery({ name: 'cropId', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'List of applicable schemes' })
  async getSchemes(
    @Query('state') state?: string,
    @Query('cropId') cropId?: string,
  ) {
    const cropIdNum = cropId ? parseInt(cropId, 10) : undefined;
    return this.schemesService.getAllSchemes(state, cropIdNum);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get details of a specific government scheme' })
  @ApiResponse({ status: 200, description: 'Scheme details retrieved' })
  async getSchemeById(@Param('id', ParseIntPipe) id: number) {
    return this.schemesService.getSchemeById(id);
  }
}
