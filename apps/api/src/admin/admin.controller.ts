import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { AdminService } from './admin.service';
import { ReportsService } from '../reports/reports.service';
import { DashboardService } from '../dashboard/dashboard.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser, JwtPayload } from '../common/decorators/current-user.decorator';
import { AdminUpdateUserDto } from './dto/admin-user.dto';
import { UpdateReportStatusDto } from '../reports/dto/create-report.dto';

function meta(req: Request) {
  return { ip: (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.ip, userAgent: req.headers['user-agent'] as string | undefined };
}

@ApiTags('admin')
@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
@ApiBearerAuth('access-token')
export class AdminController {
  constructor(
    private readonly admin: AdminService,
    private readonly reports: ReportsService,
    private readonly dashboard: DashboardService,
  ) {}

  // ── Users ──────────────────────────────────────────────────────────
  @Get('users')
  @ApiOperation({ summary: 'Admin: list users with filters' })
  async listUsers(
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('search') search?: string,
    @Query('bloodGroupId') bloodGroupId?: string,
    @Query('countryId') countryId?: string,
    @Query('stateId') stateId?: string,
    @Query('cityId') cityId?: string,
    @Query('active') active?: string,
    @Query('role') role?: string,
  ) {
    const activeBool = active === 'true' ? true : active === 'false' ? false : undefined;
    const data = await this.admin.listUsers({
      page: Number(page) || 1,
      pageSize: Math.min(100, Number(pageSize) || 20),
      search,
      bloodGroupId,
      countryId,
      stateId,
      cityId,
      active: activeBool,
      role,
    });
    return { success: true, data, message: 'Users fetched' };
  }

  @Get('users/:id')
  @ApiOperation({ summary: 'Admin: get user by id (AdminUserDto)' })
  async getUser(@Param('id') id: string) {
    const data = await this.admin.getUser(id);
    return { success: true, data, message: 'User fetched' };
  }

  @Patch('users/:id')
  @ApiOperation({ summary: 'Admin: update user profile (audited)' })
  async updateUser(@Param('id') id: string, @Body() dto: AdminUpdateUserDto, @CurrentUser() user: JwtPayload, @Req() req: Request) {
    const data = await this.admin.updateUser(id, dto, user.sub, meta(req));
    return { success: true, data, message: 'User updated' };
  }

  @Patch('users/:id/status')
  @ApiOperation({ summary: 'Admin: activate/deactivate user (audited, notifies)' })
  async updateStatus(@Param('id') id: string, @Body() dto: { active: boolean }, @CurrentUser() user: JwtPayload, @Req() req: Request) {
    const data = await this.admin.updateStatus(id, dto.active, user.sub, meta(req));
    return { success: true, data, message: 'User status updated' };
  }

  @Delete('users/:id')
  @ApiOperation({ summary: 'Admin: soft delete user (sets deletedAt, audited)' })
  async softDelete(@Param('id') id: string, @CurrentUser() user: JwtPayload, @Req() req: Request) {
    const data = await this.admin.softDelete(id, user.sub, meta(req));
    return { success: true, data, message: 'User soft-deleted' };
  }

  // ── Reports triage ─────────────────────────────────────────────────
  @Get('reports')
  @ApiOperation({ summary: 'Admin: list reports' })
  async listReports(@Query('page') page?: string, @Query('pageSize') pageSize?: string, @Query('status') status?: string) {
    const data = await this.reports.listAdmin(Number(page) || 1, Math.min(100, Number(pageSize) || 20), status);
    return { success: true, data, message: 'Reports fetched' };
  }

  @Get('reports/:id')
  @ApiOperation({ summary: 'Admin: get report by id' })
  async getReport(@Param('id') id: string) {
    const data = await this.reports.getOneAdmin(id);
    return { success: true, data, message: 'Report fetched' };
  }

  @Patch('reports/:id')
  @ApiOperation({ summary: 'Admin: update report status/comment (audited, notifies)' })
  async updateReport(@Param('id') id: string, @Body() dto: UpdateReportStatusDto, @CurrentUser() user: JwtPayload, @Req() req: Request) {
    const data = await this.reports.updateStatusAdmin(id, dto.status, dto.adminComment, user.sub, meta(req));
    return { success: true, data, message: 'Report updated' };
  }

  // ── Dashboard ──────────────────────────────────────────────────────
  @Get('dashboard')
  @ApiOperation({ summary: 'Admin: global aggregates + chart datasets' })
  async dashboardAdmin() {
    const data = await this.dashboard.getAdminDashboard();
    return { success: true, data, message: 'Admin dashboard fetched' };
  }
}
