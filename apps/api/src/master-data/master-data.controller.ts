import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { MasterDataService } from './master-data.service';
import {
  CreateBloodGroupDto,
  UpdateBloodGroupDto,
  CreateCountryDto,
  UpdateCountryDto,
  CreateStateDto,
  UpdateStateDto,
  CreateCityDto,
  UpdateCityDto,
  CreateCountryCodeDto,
  UpdateCountryCodeDto,
} from './dto/create-master.dto';
import { Public } from '../common/decorators/public.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';

@ApiTags('master')
@Controller('master')
export class MasterDataController {
  constructor(private readonly service: MasterDataService) {}

  // ── Blood Groups ───────────────────────────────────────────────────
  @Public()
  @Get('blood-groups')
  @ApiOperation({ summary: 'List blood groups (public, cacheable)' })
  listBloodGroups() {
    return this.service.listBloodGroups().then((data) => ({ success: true, data, message: 'Blood groups fetched' }));
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth('access-token')
  @Post('blood-groups')
  createBloodGroup(@Body() dto: CreateBloodGroupDto) {
    return this.service.createBloodGroup(dto).then((data) => ({ success: true, data, message: 'Created' }));
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth('access-token')
  @Patch('blood-groups/:id')
  updateBloodGroup(@Param('id') id: string, @Body() dto: UpdateBloodGroupDto) {
    return this.service.updateBloodGroup(id, dto).then((data) => ({ success: true, data, message: 'Updated' }));
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth('access-token')
  @Delete('blood-groups/:id')
  deleteBloodGroup(@Param('id') id: string) {
    return this.service.deleteBloodGroup(id).then(() => ({ success: true, data: null, message: 'Deleted' }));
  }

  // ── Country Codes ──────────────────────────────────────────────────
  @Public()
  @Get('country-codes')
  listCountryCodes() {
    return this.service.listCountryCodes().then((data) => ({ success: true, data, message: 'Country codes fetched' }));
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth('access-token')
  @Post('country-codes')
  createCountryCode(@Body() dto: CreateCountryCodeDto) {
    return this.service.createCountryCode(dto).then((data) => ({ success: true, data, message: 'Created' }));
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth('access-token')
  @Patch('country-codes/:id')
  updateCountryCode(@Param('id') id: string, @Body() dto: UpdateCountryCodeDto) {
    return this.service.updateCountryCode(id, dto).then((data) => ({ success: true, data, message: 'Updated' }));
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth('access-token')
  @Delete('country-codes/:id')
  deleteCountryCode(@Param('id') id: string) {
    return this.service.deleteCountryCode(id).then(() => ({ success: true, data: null, message: 'Deleted' }));
  }

  // ── Countries ──────────────────────────────────────────────────────
  @Public()
  @Get('countries')
  listCountries() {
    return this.service.listCountries().then((data) => ({ success: true, data, message: 'Countries fetched' }));
  }

  @Public()
  @Get('countries/:countryId/states')
  listStatesForCountry(@Param('countryId') countryId: string) {
    return this.service.listStates(countryId).then((data) => ({ success: true, data, message: 'States fetched' }));
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth('access-token')
  @Post('countries')
  createCountry(@Body() dto: CreateCountryDto) {
    return this.service.createCountry(dto).then((data) => ({ success: true, data, message: 'Created' }));
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth('access-token')
  @Patch('countries/:id')
  updateCountry(@Param('id') id: string, @Body() dto: UpdateCountryDto) {
    return this.service.updateCountry(id, dto).then((data) => ({ success: true, data, message: 'Updated' }));
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth('access-token')
  @Delete('countries/:id')
  deleteCountry(@Param('id') id: string) {
    return this.service.deleteCountry(id).then(() => ({ success: true, data: null, message: 'Deleted' }));
  }

  // ── States / Cities (admin creates via country/state context) ─────
  @Public()
  @Get('states')
  @ApiOperation({ summary: 'List all states (public), optional ?countryId= filter' })
  listAllStates(@Query('countryId') countryId?: string) {
    return this.service.listStates(countryId || undefined).then((data) => ({ success: true, data, message: 'States fetched' }));
  }

  @Public()
  @Get('cities')
  @ApiOperation({ summary: 'List all cities (public), optional ?stateId= & ?countryId= filters' })
  listAllCities(@Query('stateId') stateId?: string, @Query('countryId') countryId?: string) {
    return this.service
      .listCities(stateId || undefined, false, countryId || undefined)
      .then((data) => ({ success: true, data, message: 'Cities fetched' }));
  }

  @Public()
  @Get('states/:stateId/cities')
  listCitiesForState(@Param('stateId') stateId: string) {
    return this.service.listCities(stateId).then((data) => ({ success: true, data, message: 'Cities fetched' }));
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth('access-token')
  @Post('countries/:countryId/states')
  createState(@Param('countryId') countryId: string, @Body() dto: CreateStateDto) {
    return this.service.createState(countryId, dto).then((data) => ({ success: true, data, message: 'Created' }));
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth('access-token')
  @Patch('states/:id')
  updateState(@Param('id') id: string, @Body() dto: UpdateStateDto) {
    return this.service.updateState(id, dto).then((data) => ({ success: true, data, message: 'Updated' }));
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth('access-token')
  @Delete('states/:id')
  deleteState(@Param('id') id: string) {
    return this.service.deleteState(id).then(() => ({ success: true, data: null, message: 'Deleted' }));
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth('access-token')
  @Post('states/:stateId/cities')
  createCity(@Param('stateId') stateId: string, @Body() dto: CreateCityDto) {
    return this.service.createCity(stateId, dto).then((data) => ({ success: true, data, message: 'Created' }));
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth('access-token')
  @Patch('cities/:id')
  updateCity(@Param('id') id: string, @Body() dto: UpdateCityDto) {
    return this.service.updateCity(id, dto).then((data) => ({ success: true, data, message: 'Updated' }));
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth('access-token')
  @Delete('cities/:id')
  deleteCity(@Param('id') id: string) {
    return this.service.deleteCity(id).then(() => ({ success: true, data: null, message: 'Deleted' }));
  }
}
