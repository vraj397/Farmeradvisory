import { Body, Controller, Get, HttpCode, HttpStatus, Post, Request, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { SubmitGpsLocationDto, SubmitPincodeLocationDto } from './dto/location.dto';
import { LocationService } from './location.service';

@ApiTags('Location')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('location')
export class LocationController {
  constructor(private readonly locationService: LocationService) {}

  @Post('gps')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Submit live GPS coordinates for location verification' })
  async submitGps(@Request() req: any, @Body() dto: SubmitGpsLocationDto) {
    const farmerId = Number(req.user.userId);
    const location = await this.locationService.submitGpsLocation(farmerId, dto);
    return { message: 'GPS location saved and verified', location };
  }

  @Post('pincode')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Submit pincode + city for location verification' })
  async submitPincode(@Request() req: any, @Body() dto: SubmitPincodeLocationDto) {
    const farmerId = Number(req.user.userId);
    const location = await this.locationService.submitPincodeLocation(farmerId, dto);
    return { message: 'Pincode location saved and verified', location };
  }

  @Get('current')
  @ApiOperation({ summary: 'Get farmer\'s current verified location' })
  async getCurrent(@Request() req: any) {
    const farmerId = Number(req.user.userId);
    const location = await this.locationService.getCurrentLocation(farmerId);
    return { location };
  }
}
