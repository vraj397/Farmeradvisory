import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, ParseIntPipe, Post, Put, Request, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CreateFarmerCropDto, UpdateFarmerCropDto } from './dto/farmer-crop.dto';
import { FarmerCropsService } from './farmer-crops.service';

@ApiTags('Farmer Crops')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('farmer-crops')
export class FarmerCropsController {
  constructor(private readonly farmerCropsService: FarmerCropsService) {}

  @Get()
  @ApiOperation({ summary: 'List all crops for the authenticated farmer' })
  async getAll(@Request() req: any) {
    return this.farmerCropsService.getAll(Number(req.user.userId));
  }

  @Post()
  @ApiOperation({ summary: 'Add a new crop to the farmer\'s crop list' })
  async create(@Request() req: any, @Body() dto: CreateFarmerCropDto) {
    return this.farmerCropsService.create(Number(req.user.userId), dto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update crop stage, dates, area, or status' })
  async update(
    @Request() req: any,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateFarmerCropDto,
  ) {
    return this.farmerCropsService.update(id, Number(req.user.userId), dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Archive (soft-delete) a farmer crop' })
  async remove(@Request() req: any, @Param('id', ParseIntPipe) id: number) {
    await this.farmerCropsService.remove(id, Number(req.user.userId));
  }
}
