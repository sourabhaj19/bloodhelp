import { Controller, Get, Param, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { DonorsService } from './donors.service';
import { DonorSearchDto } from './dto/donor-search.dto';
import { OptionalJwtAuthGuard } from '../common/guards/optional-jwt.guard';
import { JwtPayload } from '../common/decorators/current-user.decorator';

function getOptionalUser(req: Request): JwtPayload | undefined {
  return (req as any).user as JwtPayload | undefined;
}

@ApiTags('donors')
@Controller('donors')
export class DonorsController {
  constructor(private readonly donors: DonorsService) {}

  @UseGuards(OptionalJwtAuthGuard)
  @Get()
  @ApiOperation({ summary: 'Search donors — tiered response (public vs authenticated)' })
  async search(@Query() dto: DonorSearchDto, @Req() req: Request) {
    const user = getOptionalUser(req);
    const data = await this.donors.search(dto, user);
    return { success: true, data, message: 'Donors fetched' };
  }

  @UseGuards(OptionalJwtAuthGuard)
  @Get('map')
  @ApiOperation({ summary: 'Donor map markers — lightweight tiered DTOs, max 500' })
  async map(@Query() dto: DonorSearchDto, @Req() req: Request) {
    const user = getOptionalUser(req);
    const data = await this.donors.mapMarkers(dto, user);
    return { success: true, data: { items: data, total: data.length }, message: 'Map markers fetched' };
  }

  @UseGuards(OptionalJwtAuthGuard)
  @Get(':id')
  @ApiOperation({ summary: 'Get single donor — tiered response' })
  async getOne(@Param('id') id: string, @Req() req: Request) {
    const user = getOptionalUser(req);
    const data = await this.donors.findOne(id, user);
    return { success: true, data, message: 'Donor fetched' };
  }
}
