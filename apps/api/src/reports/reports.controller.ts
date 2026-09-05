import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ReportsService } from './reports.service';
import { CreateReportDto } from './dto/create-report.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser, JwtPayload } from '../common/decorators/current-user.decorator';

@ApiTags('reports')
@Controller('reports')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('access-token')
export class ReportsController {
  constructor(private readonly reports: ReportsService) {}

  @Get('reasons')
  @ApiOperation({ summary: 'List active report reasons (for the report dialog)' })
  async reasons() {
    const data = await this.reports.listReasons();
    return { success: true, data, message: 'Report reasons fetched' };
  }

  @Get('mine')
  @ApiOperation({ summary: 'List reports filed by me (brief, no admin notes)' })
  async mine(@CurrentUser() user: JwtPayload) {
    const data = await this.reports.listMine(user.sub);
    return { success: true, data, message: 'My reports fetched' };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get one of my reports by id (brief)' })
  async oneMine(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    const data = await this.reports.getOneMine(id, user.sub);
    return { success: true, data, message: 'Report fetched' };
  }

  @Post()
  @ApiOperation({ summary: 'Report a donor/user' })
  async create(@CurrentUser() user: JwtPayload, @Body() dto: CreateReportDto) {
    const data = await this.reports.create(user.sub, dto.reportedUserId, dto.reasonId, dto.description);
    return { success: true, data, message: 'Report submitted' };
  }
}
