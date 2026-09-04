import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { GeocodingService } from './geocoding.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

@ApiTags('geocoding')
@Controller('geocoding')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('access-token')
export class GeocodingController {
  constructor(private readonly geocoding: GeocodingService) {}

  @Get('forward')
  @ApiOperation({ summary: 'Forward geocode address → coordinates (proxied)' })
  async forward(@Query('address') address: string, @Query('q') q?: string) {
    const query = address ?? q;
    if (!query) return { success: true, data: [], message: 'No query' };
    const data = await this.geocoding.forwardGeocode(query);
    return { success: true, data, message: 'Geocoding results' };
  }

  @Get('reverse')
  @ApiOperation({ summary: 'Reverse geocode lat/lng → address (proxied)' })
  async reverse(@Query('lat') lat: string, @Query('lng') lng: string, @Query('lon') lon?: string) {
    const latitude = parseFloat(lat);
    const longitude = parseFloat(lng ?? lon ?? '');
    if (isNaN(latitude) || isNaN(longitude)) {
      return { success: false, error: { code: 'INVALID_COORDS', message: 'lat/lng required' } };
    }
    const data = await this.geocoding.reverseGeocode(latitude, longitude);
    return { success: true, data, message: 'Reverse geocoding result' };
  }
}
