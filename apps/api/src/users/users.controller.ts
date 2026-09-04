import { Body, Controller, Get, Patch, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { UsersService } from './users.service';
import { UpdateProfileDto, UpdateStatusDto } from './dto/update-profile.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser, JwtPayload } from '../common/decorators/current-user.decorator';

function meta(req: Request) {
  return {
    ip: (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.ip,
    userAgent: req.headers['user-agent'] as string | undefined,
  };
}

@ApiTags('users')
@Controller('users')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('access-token')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get('me')
  @ApiOperation({ summary: 'Get own profile (alias of /auth/me)' })
  async getMe(@CurrentUser() user: JwtPayload) {
    const data = await this.users.getMe(user.sub);
    return { success: true, data, message: 'Profile fetched' };
  }

  @Patch('me')
  @ApiOperation({ summary: 'Update own profile' })
  async patchMe(@CurrentUser() user: JwtPayload, @Body() dto: UpdateProfileDto, @Req() req: Request) {
    const data = await this.users.updateMe(user.sub, dto, meta(req));
    return { success: true, data, message: 'Profile updated' };
  }

  @Patch('me/status')
  @ApiOperation({ summary: 'Self toggle active status' })
  async patchStatus(@CurrentUser() user: JwtPayload, @Body() dto: UpdateStatusDto, @Req() req: Request) {
    const data = await this.users.updateMyStatus(user.sub, dto.active, meta(req));
    return { success: true, data: { active: data.active }, message: 'Status updated' };
  }
}
