import { Controller, Get, Patch, Param, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser, JwtPayload } from '../common/decorators/current-user.decorator';

@ApiTags('notifications')
@Controller('notifications')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('access-token')
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  @Get()
  @ApiOperation({ summary: 'List notifications for current user' })
  async list(@CurrentUser() user: JwtPayload, @Query('page') page?: string, @Query('pageSize') pageSize?: string, @Query('isRead') isRead?: string) {
    const isReadBool = isRead === 'true' ? true : isRead === 'false' ? false : undefined;
    const data = await this.notifications.list(user.sub, Number(page) || 1, Math.min(100, Number(pageSize) || 20), isReadBool);
    return { success: true, data, message: 'Notifications fetched' };
  }

  @Patch('read-all')
  @ApiOperation({ summary: 'Mark all notifications as read' })
  async readAll(@CurrentUser() user: JwtPayload) {
    const data = await this.notifications.markAllRead(user.sub);
    return { success: true, data, message: 'All marked read' };
  }

  @Patch(':id/read')
  @ApiOperation({ summary: 'Mark single notification as read (IDOR checked)' })
  async markRead(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    const data = await this.notifications.markRead(user.sub, id);
    return { success: true, data, message: 'Marked read' };
  }
}
