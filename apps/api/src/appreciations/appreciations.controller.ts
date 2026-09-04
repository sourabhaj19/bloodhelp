import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AppreciationsService } from './appreciations.service';
import { CreateAppreciationDto } from './dto/create-appreciation.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser, JwtPayload } from '../common/decorators/current-user.decorator';

@ApiTags('appreciations')
@Controller('appreciations')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('access-token')
export class AppreciationsController {
  constructor(private readonly appreciations: AppreciationsService) {}

  @Post()
  @ApiOperation({ summary: 'Give appreciation/thanks to a donor' })
  async create(@CurrentUser() user: JwtPayload, @Body() dto: CreateAppreciationDto) {
    const data = await this.appreciations.give(user.sub, dto.receiverUserId, dto.message);
    return { success: true, data, message: 'Appreciation sent' };
  }

  @Get('received')
  @ApiOperation({ summary: 'List appreciations received by current user' })
  async received(@CurrentUser() user: JwtPayload, @Query('page') page?: string, @Query('pageSize') pageSize?: string) {
    const data = await this.appreciations.listReceived(user.sub, Number(page) || 1, Math.min(100, Number(pageSize) || 20));
    return { success: true, data, message: 'Received appreciations fetched' };
  }

  @Get('given')
  @ApiOperation({ summary: 'List appreciations given by current user' })
  async given(@CurrentUser() user: JwtPayload, @Query('page') page?: string, @Query('pageSize') pageSize?: string) {
    const data = await this.appreciations.listGiven(user.sub, Number(page) || 1, Math.min(100, Number(pageSize) || 20));
    return { success: true, data, message: 'Given appreciations fetched' };
  }
}
