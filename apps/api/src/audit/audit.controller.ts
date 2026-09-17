import { BadRequestException, Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuditService } from './audit.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

@ApiTags('admin')
@Controller('admin/audit-logs')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
@ApiBearerAuth('access-token')
export class AuditController {
  constructor(private readonly audit: AuditService) {}

  @Get()
  @ApiOperation({ summary: 'Admin: list audit logs (paginated, filterable)' })
  async list(
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('entityType') entityType?: string,
    @Query('entityId') entityId?: string,
    @Query('actorUserId') actorUserId?: string,
    @Query('action') action?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    if (entityId && !UUID_RE.test(entityId.trim())) {
      throw new BadRequestException({ code: 'INVALID_ENTITY_ID', message: 'entityId must be a valid UUID' });
    }
    if (actorUserId && !UUID_RE.test(actorUserId.trim())) {
      throw new BadRequestException({ code: 'INVALID_ACTOR_ID', message: 'actorUserId must be a valid UUID' });
    }
    let fromDate: Date | undefined;
    let toDate: Date | undefined;
    if (from) {
      fromDate = new Date(from);
      if (isNaN(fromDate.getTime())) throw new BadRequestException({ code: 'INVALID_FROM', message: 'from must be a valid date (YYYY-MM-DD)' });
    }
    if (to) {
      toDate = new Date(to);
      if (isNaN(toDate.getTime())) throw new BadRequestException({ code: 'INVALID_TO', message: 'to must be a valid date (YYYY-MM-DD)' });
      // inclusive end of day
      toDate.setHours(23, 59, 59, 999);
    }
    if (fromDate && toDate && fromDate > toDate) {
      throw new BadRequestException({ code: 'INVALID_RANGE', message: 'from must be before to' });
    }
    const data = await this.audit.list({
      page: page ? Number(page) : 1,
      pageSize: pageSize ? Number(pageSize) : 20,
      entityType: entityType || undefined,
      entityId: entityId?.trim() || undefined,
      actorUserId: actorUserId?.trim() || undefined,
      action: action || undefined,
      from: fromDate,
      to: toDate,
    });
    return { success: true, data, message: 'Audit logs fetched' };
  }
}
