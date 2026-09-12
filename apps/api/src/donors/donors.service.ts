import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { DonorSearchDto } from './dto/donor-search.dto';
import { JwtPayload } from '../common/decorators/current-user.decorator';

@Injectable()
export class DonorsService {
  constructor(private readonly prisma: PrismaService) {}

  private clampPageSize(n?: number): number {
    if (!n || isNaN(n as any)) return 20;
    return Math.min(100, Math.max(1, Math.floor(n)));
  }

  private maskName(first: string, last: string): string {
    if (!first) return '***';
    const visible = first.slice(0, 2);
    const masked = '*'.repeat(Math.max(0, first.length - 2));
    return `${visible}${masked} ${last ? last.charAt(0) + '.' : ''}`;
  }

  private maskMobile(mobile?: string, dialCode?: string): string {
    if (!mobile) return '';
    const digits = String(mobile).replace(/\D/g, '');
    if (!digits.length) return '';
    if (digits.length <= 4) return '*'.repeat(digits.length);
    const visibleStart = 2;
    const visibleEnd = 2;
    const maskedLen = digits.length - visibleStart - visibleEnd;
    const maskedDigits = digits.slice(0, visibleStart) + '*'.repeat(maskedLen) + digits.slice(digits.length - visibleEnd);
    const cleanDial = dialCode ? String(dialCode).trim() : '';
    return cleanDial ? `${cleanDial} ${maskedDigits}` : maskedDigits;
  }

  async search(dto: DonorSearchDto, requester?: JwtPayload) {
    // lat/lng must come together; radius without a center is ignored
    // (location-dropdown search works without coordinates).
    const hasLat = dto.lat !== undefined && dto.lat !== null;
    const hasLng = dto.lng !== undefined && dto.lng !== null;
    if ((hasLat && !hasLng) || (!hasLat && hasLng)) {
      throw new BadRequestException({ code: 'INVALID_LOCATION', message: 'lat and lng must be provided together' });
    }

    const page = Math.max(1, dto.page ?? 1);
    const pageSize = this.clampPageSize(dto.pageSize);
    const offset = (page - 1) * pageSize;

    const isAuthenticated = !!requester;
    const excludeUserId = requester?.sub;

    // Build where clause for non-spatial filters (MySQL: mode insensitive not supported, LIKE is case-insensitive via collation)
    const where: any = { deletedAt: null };
    // Never show the logged-in user in their own Find-donor results
    if (excludeUserId) where.id = { not: excludeUserId };
    if (dto.active !== undefined) {
      const activeVal = String(dto.active).toLowerCase();
      if (activeVal === 'true' || activeVal === 'false') where.active = activeVal === 'true';
    } else {
      where.active = true;
    }
    if (dto.bloodGroupId) where.bloodGroupId = dto.bloodGroupId;
    // Prefer IDs (new dropdown UI); fall back to names for backwards compat.
    if (dto.countryId) where.countryId = dto.countryId;
    else if (dto.country) where.country = { name: dto.country };
    if (dto.stateId) where.stateId = dto.stateId;
    else if (dto.state) where.state = { name: dto.state };
    if (dto.cityId) where.cityId = dto.cityId;
    else if (dto.city) where.city = { name: dto.city };
    if (dto.area) where.area = { contains: dto.area };
    if (dto.pinCode) where.pinCode = dto.pinCode;
    if (dto.search) {
      where.OR = [
        { firstName: { contains: dto.search } },
        { lastName: { contains: dto.search } },
        { area: { contains: dto.search } },
      ];
    }

    // If geospatial search requested, use Haversine formula for MySQL
    if (hasLat && hasLng) {
      return this.searchWithMySQL(dto, page, pageSize, offset, isAuthenticated, where, excludeUserId);
    }

    // Non-spatial fallback: plain Prisma
    const sortMap: Record<string, any> = {
      recent: { createdAt: 'desc' },
      name: [{ firstName: 'asc' }, { lastName: 'asc' }],
      distance: { createdAt: 'desc' },
    };
    const orderBy = sortMap[dto.sortBy ?? 'recent'] ?? { createdAt: 'desc' };

    const [total, users] = await Promise.all([
      this.prisma.user.count({ where }),
      this.prisma.user.findMany({
        where,
        include: { bloodGroup: true, country: true, state: true, city: true, countryCode: true },
        orderBy,
        skip: offset,
        take: pageSize,
      }),
    ]);

    const items = users.map((u) => this.mapDonor(u, isAuthenticated, null));
    return { items, page, pageSize, total, totalPages: Math.ceil(total / pageSize) };
  }

  private async searchWithMySQL(
    dto: DonorSearchDto,
    page: number,
    pageSize: number,
    offset: number,
    isAuthenticated: boolean,
    baseWhere: any,
    excludeUserId?: string,
  ) {
    const lat = dto.lat!;
    const lng = dto.lng!;
    const radiusKm = dto.radiusKm && dto.radiusKm !== 'any' ? parseFloat(dto.radiusKm) : null;
    if (dto.radiusKm && dto.radiusKm !== 'any' && isNaN(radiusKm!)) {
      throw new BadRequestException({ code: 'INVALID_RADIUS', message: 'radiusKm must be 5/10/25/50/100/any' });
    }

    // MySQL uses positional ? placeholders, so params must be pushed in the
    // exact textual order the placeholders appear in the SQL below:
    //   1-3: haversine lat/lng/lat (SELECT)  4+: WHERE filters
    //   then radius filter, then LIMIT/OFFSET.
    const whereClauses: string[] = ['u.deleted_at IS NULL'];
    const whereParams: any[] = [];

    // Never show the logged-in user in their own Find-donor results
    if (excludeUserId) {
      whereClauses.push('u.id != ?');
      whereParams.push(excludeUserId);
    }

    if (baseWhere.active !== undefined) {
      whereClauses.push('u.active = ?');
      whereParams.push(baseWhere.active ? 1 : 0);
    }
    if (baseWhere.bloodGroupId) {
      whereClauses.push('u.blood_group_id = ?');
      whereParams.push(baseWhere.bloodGroupId);
    }
    if (baseWhere.countryId) {
      whereClauses.push('u.country_id = ?');
      whereParams.push(baseWhere.countryId);
    } else if (dto.country) {
      whereClauses.push('c.name = ?');
      whereParams.push(dto.country);
    }
    if (baseWhere.stateId) {
      whereClauses.push('u.state_id = ?');
      whereParams.push(baseWhere.stateId);
    } else if (dto.state) {
      whereClauses.push('s.name = ?');
      whereParams.push(dto.state);
    }
    if (baseWhere.cityId) {
      whereClauses.push('u.city_id = ?');
      whereParams.push(baseWhere.cityId);
    } else if (dto.city) {
      whereClauses.push('ci.name = ?');
      whereParams.push(dto.city);
    }
    if (dto.pinCode) {
      whereClauses.push('u.pin_code = ?');
      whereParams.push(dto.pinCode);
    }
    if (dto.area) {
      whereClauses.push('u.area LIKE ?');
      whereParams.push(`%${dto.area}%`);
    }

    // Haversine distance expression in km (MySQL)
    // 6371 * acos(cos(radians(lat)) * cos(radians(u.latitude)) * cos(radians(u.longitude)-radians(lng)) + sin(radians(lat))*sin(radians(u.latitude)))
    const haversineExpr = `(6371 * acos(LEAST(1, GREATEST(-1, cos(radians(?)) * cos(radians(u.latitude)) * cos(radians(u.longitude) - radians(?)) + sin(radians(?)) * sin(radians(u.latitude))))))`;

    const radiusParams: any[] = [];
    let radiusFilter = '1=1';
    if (radiusKm !== null) {
      radiusFilter = 't.distance_km <= ?';
      radiusParams.push(radiusKm);
    }

    const whereSql = whereClauses.join(' AND ');

    // Subquery computes distance_km per row; outer query filters + counts.
    // (Avoids HAVING-without-GROUP-BY quirks and keeps param order explicit.)
    // MySQL 8 supports window function COUNT(*) OVER().
    // NOTE: COUNT(*) returns BIGINT which Prisma surfaces as BigInt and then
    // fails to serialize ("Do not know how to serialize a BigInt"), killing
    // the geo path and silently falling back to no-distance results. CAST to
    // CHAR so it arrives as a string; Number() below parses it back.
    const dataSql = `
      SELECT t.*, CAST(COUNT(*) OVER() AS CHAR) as total_count
      FROM (
        SELECT
          u.id, u.first_name, u.last_name, u.area, u.pin_code, u.latitude, u.longitude,
          u.mobile, u.blood_group_id, u.country_id, u.state_id, u.city_id, u.active, u.created_at,
          bg.code as blood_group_code, bg.label as blood_group_label,
          c.name as country_name, s.name as state_name, ci.name as city_name,
          cc.\`dialCode\` as dial_code,
          ${haversineExpr} as distance_km
        FROM users u
        LEFT JOIN blood_groups bg ON bg.id = u.blood_group_id
        LEFT JOIN countries c ON c.id = u.country_id
        LEFT JOIN states s ON s.id = u.state_id
        LEFT JOIN cities ci ON ci.id = u.city_id
        LEFT JOIN country_codes cc ON cc.id = u.country_code_id
        WHERE ${whereSql}
      ) as t
      WHERE ${radiusFilter}
      ORDER BY t.distance_km ASC
      LIMIT ? OFFSET ?
    `;
    const params = [lat, lng, lat, ...whereParams, ...radiusParams, pageSize, offset];

    try {
      const rows: any[] = await this.prisma.$queryRawUnsafe(dataSql, ...params);
      const total = rows.length > 0 ? Number(rows[0].total_count) : 0;

      let computedTotal = total;
      if (rows.length === 0) {
        // Empty page: fall back to Prisma count ignoring geo radius (approx).
        try {
          computedTotal = await this.prisma.user.count({ where: baseWhere });
        } catch {
          computedTotal = 0;
        }
      }

      const items = rows.map((r: any) =>
        this.mapDonor(
          {
            id: r.id,
            firstName: r.first_name,
            lastName: r.last_name,
            area: r.area,
            pinCode: r.pin_code,
            latitude: r.latitude,
            longitude: r.longitude,
            mobile: r.mobile,
            dialCode: r.dial_code,
            countryCode: r.dial_code ? { dialCode: r.dial_code } : null,
            bloodGroupId: r.blood_group_id,
            bloodGroup: r.blood_group_code ? { code: r.blood_group_code, label: r.blood_group_label } : null,
            country: r.country_name ? { name: r.country_name } : null,
            state: r.state_name ? { name: r.state_name } : null,
            city: r.city_name ? { name: r.city_name } : null,
            active: !!r.active,
            createdAt: r.created_at,
          },
          isAuthenticated,
          r.distance_km != null ? Number(r.distance_km) : null,
        ),
      );

      return { items, page, pageSize, total: computedTotal, totalPages: Math.ceil(computedTotal / pageSize) };
    } catch (e) {
      // Fallback to non-geo Prisma search if raw fails
      const [total, users] = await Promise.all([
        this.prisma.user.count({ where: baseWhere }),
        this.prisma.user.findMany({
          where: baseWhere,
          include: { bloodGroup: true, country: true, state: true, city: true, countryCode: true },
          skip: offset,
          take: pageSize,
          orderBy: { createdAt: 'desc' },
        }),
      ]);
      const items = users.map((u) => this.mapDonor(u, isAuthenticated, null));
      return { items, page, pageSize, total, totalPages: Math.ceil(total / pageSize) };
    }
  }

  async findOne(id: string, requester?: JwtPayload) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: { bloodGroup: true, country: true, state: true, city: true, countryCode: true },
    });
    if (!user || user.deletedAt) throw new BadRequestException({ code: 'DONOR_NOT_FOUND', message: 'Donor not found' });
    if (!user.active) throw new BadRequestException({ code: 'DONOR_INACTIVE', message: 'Donor is inactive' });
    return this.mapDonor(user, !!requester, null);
  }

  async mapMarkers(dto: DonorSearchDto, requester?: JwtPayload) {
    const result = await this.search({ ...dto, page: 1, pageSize: 500 }, requester);
    if (result.total > 500) {
      throw new BadRequestException({
        code: 'MAP_TOO_MANY_MARKERS',
        message: 'Too many markers — narrow your filters (max 500)',
      });
    }
    const isAuthenticated = !!requester;
    return result.items.map((d: any) => ({
      id: d.id,
      bloodGroup: d.bloodGroup,
      displayName: d.displayName,
      country: d.country,
      state: d.state,
      city: d.city,
      area: d.area,
      latitude: isAuthenticated ? d.latitude : undefined,
      longitude: isAuthenticated ? d.longitude : undefined,
      approxDistanceKm: d.approxDistanceKm,
    }));
  }

  private mapDonor(u: any, isAuthenticated: boolean, distanceKm: number | null) {
    const dial = u.countryCode?.dialCode ?? (u as any).dialCode ?? null;
    const base: any = {
      id: u.id,
      bloodGroup: u.bloodGroup?.code ?? u.bloodGroup ?? null,
      bloodGroupLabel: u.bloodGroup?.label ?? null,
      country: u.country?.name ?? u.country ?? null,
      state: u.state?.name ?? u.state ?? null,
      city: u.city?.name ?? u.city ?? null,
      area: u.area,
      active: u.active,
      createdAt: (u as any).createdAt,
    };
    if (distanceKm !== null && distanceKm !== undefined) base.approxDistanceKm = Math.round(distanceKm * 10) / 10;
    if (isAuthenticated) {
      base.displayName = `${u.firstName} ${u.lastName}`;
      base.fullName = `${u.firstName} ${u.lastName}`;
      base.firstName = u.firstName;
      base.lastName = u.lastName;
      base.pinCode = u.pinCode;
      base.latitude = u.latitude != null ? Number(u.latitude) : undefined;
      base.longitude = u.longitude != null ? Number(u.longitude) : undefined;
      if (u.mobile) {
        base.mobile = dial ? `${dial} ${u.mobile}` : u.mobile;
        base.maskedMobile = this.maskMobile(u.mobile, dial);
      }
    } else {
      base.displayName = this.maskName(u.firstName ?? '', u.lastName ?? '');
      if (u.mobile) base.maskedMobile = this.maskMobile(u.mobile, dial);
    }
    return base;
  }
}
