import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Query,
  UseGuards,
  Delete,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { AdminService } from './admin.service';

@ApiTags('Admin Panel')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('stats')
  @ApiOperation({ summary: 'Get overall platform statistics (admin only)' })
  @ApiResponse({ status: 200, description: 'Platform statistics retrieved successfully' })
  async getStats() {
    return this.adminService.getPlatformStats();
  }

  @Get('users')
  @ApiOperation({ summary: 'List all users with optional role filter (admin only)' })
  @ApiQuery({ name: 'role', required: false, enum: ['farmer', 'field_officer', 'admin'] })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'offset', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'User list retrieved successfully' })
  async listUsers(
    @Query('role') role?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    const lim = limit ? parseInt(limit, 10) : 50;
    const off = offset ? parseInt(offset, 10) : 0;
    return this.adminService.listAllUsers(role, lim, off);
  }

  @Patch('users/:id/role')
  @ApiOperation({ summary: 'Update a user role (admin only)' })
  @ApiResponse({ status: 200, description: 'User role updated' })
  async updateRole(
    @Param('id', ParseIntPipe) userId: number,
    @Body('role') newRole: string,
  ) {
    return this.adminService.updateUserRole(userId, newRole);
  }

  @Delete('users/:id')
  @ApiOperation({ summary: 'Deactivate/disable a user account (admin only)' })
  @ApiResponse({ status: 200, description: 'User deactivated' })
  async deactivateUser(@Param('id', ParseIntPipe) userId: number) {
    return this.adminService.deactivateUser(userId);
  }

  @Get('audit-logs')
  @ApiOperation({ summary: 'Get recent audit logs (admin only)' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Audit logs retrieved' })
  async getAuditLogs(@Query('limit') limit?: string) {
    const lim = limit ? parseInt(limit, 10) : 100;
    return this.adminService.getAuditLogs(lim);
  }
}
