import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface ForwardResult {
  latitude: number;
  longitude: number;
  displayName: string;
}
export interface ReverseResult {
  displayName: string;
  address: any;
}

@Injectable()
export class GeocodingService {
  private readonly logger = new Logger(GeocodingService.name);
  constructor(private readonly config: ConfigService) {}

  private get provider(): string {
    return this.config.get<string>('app.geocoding.provider', '') ?? '';
  }
  private get baseUrl(): string {
    return this.config.get<string>('app.geocoding.baseUrl', '') ?? '';
  }
  private get apiKey(): string {
    return this.config.get<string>('app.geocoding.apiKey', '') ?? '';
  }

  async forwardGeocode(query: string): Promise<ForwardResult[]> {
    if (!this.provider || !this.baseUrl) {
      this.logger.warn('Geocoding provider not configured — returning empty result');
      return [];
    }
    // Never forward PII beyond query text (per §7.1)
    try {
      const url = new URL(this.baseUrl);
      // Nominatim example: /search?q=...&format=json&limit=5
      // We treat baseUrl as search endpoint base; append params generically
      url.searchParams.set('q', query);
      url.searchParams.set('format', 'json');
      url.searchParams.set('limit', '5');
      if (this.apiKey) url.searchParams.set('key', this.apiKey);
      const res = await fetch(url.toString(), {
        headers: { 'User-Agent': 'BloodHelp/1.0 (geocoding proxy)' },
      });
      if (!res.ok) throw new Error(`Geocoding forward failed ${res.status}`);
      const data: any = await res.json();
      // Normalize to ForwardResult for both Nominatim and generic providers
      if (Array.isArray(data)) {
        return data.slice(0, 5).map((r: any) => ({
          latitude: parseFloat(r.lat ?? r.latitude),
          longitude: parseFloat(r.lon ?? r.longitude ?? r.lng),
          displayName: r.display_name ?? r.displayName ?? query,
        }));
      }
      return [];
    } catch (e) {
      this.logger.error(`forwardGeocode error: ${e}`);
      return [];
    }
  }

  async reverseGeocode(lat: number, lng: number): Promise<ReverseResult | null> {
    if (!this.provider || !this.baseUrl) {
      this.logger.warn('Geocoding provider not configured for reverse');
      return null;
    }
    try {
      // Expect baseUrl to be Nominatim search endpoint; derive reverse endpoint by replacing /search with /reverse if needed
      // Simpler: if baseUrl contains /search, use /reverse sibling; else use baseUrl directly with lat/lon params
      let urlStr = this.baseUrl;
      if (urlStr.includes('/search')) urlStr = urlStr.replace('/search', '/reverse');
      const url = new URL(urlStr);
      url.searchParams.set('lat', String(lat));
      url.searchParams.set('lon', String(lng));
      url.searchParams.set('format', 'json');
      if (this.apiKey) url.searchParams.set('key', this.apiKey);
      const res = await fetch(url.toString(), {
        headers: { 'User-Agent': 'BloodHelp/1.0 (geocoding proxy)' },
      });
      if (!res.ok) throw new Error(`Geocoding reverse failed ${res.status}`);
      const data: any = await res.json();
      return {
        displayName: data.display_name ?? data.displayName ?? `${lat},${lng}`,
        address: data.address ?? {},
      };
    } catch (e) {
      this.logger.error(`reverseGeocode error: ${e}`);
      return null;
    }
  }
}
