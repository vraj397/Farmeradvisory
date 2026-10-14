import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, ParseIntPipe, Post, Put, Request, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { ActivitiesService } from './activities.service';
import { CreateActivityDto, UpdateActivityDto } from './dto/activity.dto';

@ApiTags('Farm Activities')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('activities')
export class ActivitiesController {
  constructor(private readonly activitiesService: ActivitiesService) {}

  @Get()
  @ApiOperation({ summary: 'Get daily farm activity timeline for authenticated farmer' })
  async getAll(@Request() req: any) {
    return this.activitiesService.getAll(Number(req.user.userId));
  }

  @Post()
  @ApiOperation({ summary: 'Log a new farm activity (irrigation, fertilizer, etc.)' })
  async create(@Request() req: any, @Body() dto: CreateActivityDto) {
    return this.activitiesService.create(Number(req.user.userId), dto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update an existing farm activity' })
  async update(
    @Request() req: any,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateActivityDto,
  ) {
    return this.activitiesService.update(id, Number(req.user.userId), dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a farm activity log entry' })
  async remove(@Request() req: any, @Param('id', ParseIntPipe) id: number) {
    await this.activitiesService.remove(id, Number(req.user.userId));
  }
}
