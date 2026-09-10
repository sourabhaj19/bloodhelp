import {
  AfterViewInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ElementRef,
  Input,
  OnChanges,
  OnDestroy,
  SimpleChanges,
  ViewChild,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';

// Leaflet comes from the CDN <script> tag in index.html (official setup:
// https://unpkg.com/leaflet@1.9.4/dist/leaflet.js AFTER the Leaflet CSS).
// No npm import — the global L is used directly, exactly like the docs.
declare const L: any;

// Official OpenStreetMap tile layer (https://leafletjs.com quick start).
// Attribution is obligatory per the OSM copyright notice — always rendered.
const TILE_URL = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
const ATTRIBUTION = '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>';

function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function toNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function hasCoords(d: any): boolean {
  const lat = toNumber(d?.latitude);
  const lng = toNumber(d?.longitude);
  return lat !== null && lng !== null && Math.abs(lat) <= 90 && Math.abs(lng) <= 180;
}

/**
 * DonorMapComponent — donor coordinates straight into Leaflet.
 * Usage: <app-donor-map [donors]="donorList"></app-donor-map>
 */
@Component({
  selector: 'app-donor-map',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div #mapEl class="donor-map" [style.height.px]="height" role="application" aria-label="Donor map"></div>
    <div *ngIf="!initialized && !loadError" class="map-empty muted text-sm">Loading map…</div>
    <div *ngIf="plottedCount === 0 && initialized" class="map-empty muted text-sm">
      No precise locations to plot for these results yet — try a wider radius or different filters.
    </div>
    <div *ngIf="loadError" class="map-empty muted text-sm">
      Map could not be loaded. The donor list still works.
      <span *ngIf="leafletError" class="map-err">({{ leafletError }})</span>
    </div>
  `,
  styles: [
    `
      :host { display: block; }
      .donor-map {
        width: 100%;
        min-height: 280px;
        border-radius: 12px;
        border: 1px solid #ece5e3;
        z-index: 0;
        background: #f2f4f7;
      }
      /* Keep Leaflet panes/controls below the app topbar (z 400) and dialogs */
      :host ::ng-deep .leaflet-pane { z-index: 200; }
      :host ::ng-deep .leaflet-top,
      :host ::ng-deep .leaflet-bottom { z-index: 300; }
      :host ::ng-deep .leaflet-container { font-family: inherit; z-index: 0; }
      :host ::ng-deep .donor-pin {
        display: flex; align-items: center; justify-content: center;
        min-width: 38px; height: 28px; padding: 0 6px;
        background: linear-gradient(135deg, #d92d20, #912018);
        color: #fff; font-weight: 800; font-size: 12px;
        border: 2px solid #fff; border-radius: 999px;
        box-shadow: 0 2px 8px rgba(16, 24, 40, 0.35);
        white-space: nowrap;
      }
      :host ::ng-deep .donor-pin.focused {
        outline: 3px solid rgba(180, 35, 24, 0.35);
        transform: scale(1.12);
      }
      :host ::ng-deep .me-pin {
        display: flex; align-items: center; justify-content: center;
        width: 30px; height: 30px;
        background: #175cd3; color: #fff; font-size: 14px;
        border: 3px solid #fff; border-radius: 50%;
        box-shadow: 0 2px 8px rgba(16, 24, 40, 0.4);
      }
      :host ::ng-deep .donor-popup { font-size: 0.85rem; line-height: 1.4; }
      :host ::ng-deep .donor-popup strong { font-size: 0.9rem; }
      .map-empty { padding: 10px 2px 0; }
      .map-err { color: #b42318; }
      .muted { color: #667085; }
    `,
  ],
})
export class DonorMapComponent implements AfterViewInit, OnChanges, OnDestroy {
  /** Donor list — items with valid numeric `latitude`/`longitude` get a pin. */
  @Input() donors: any[] = [];
  @Input() centerLat: number | string | null = null;
  @Input() centerLng: number | string | null = null;
  @Input() focusId: string | null = null;
  @Input() height = 380;

  @ViewChild('mapEl', { static: true }) mapEl!: ElementRef<HTMLDivElement>;

  private cdr = inject(ChangeDetectorRef);

  private map: any = null;
  private markersLayer: any = null;
  private markerById = new Map<string, any>();
  // Never call map.getBounds() before a view exists — Leaflet throws
  // "Set map center and zoom first." on a fresh map. Track viewSet instead.
  private viewSet = false;
  private activeFocusId: string | null = null;
  // Requests that arrive before the map exists (e.g. dialog still animating
  // open) are queued and flushed once the map is ready.
  private pendingFocusId: string | null = null;
  private pendingShowAll = false;

  initialized = false;
  loadError = false;
  leafletError = '';
  plottedCount = 0;

  ngAfterViewInit() {
    if (typeof L === 'undefined') {
      this.leafletError = 'Leaflet CDN script failed to load — check internet access to unpkg.com';
      this.loadError = true;
      this.cdr.markForCheck();
      return;
    }
    this.initMap();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['focusId']) {
      this.activeFocusId = this.focusId ? String(this.focusId) : null;
    }
    if (!this.map) return;
    if (changes['donors'] || changes['centerLat'] || changes['centerLng']) {
      this.refreshMarkers(true);
    }
    // NOTE: pin focus is driven via the focusDonor()/showAll() methods, not via
    // focusId changes — clicking the same row twice must still pan the map,
    // and identical input values do not trigger ngOnChanges.
  }

  ngOnDestroy() {
    try {
      this.map?.remove();
    } catch {
      /* already torn down */
    }
    this.map = null;
  }

  private initMap() {
    if (this.map || !this.mapEl?.nativeElement) return;
    try {
      this.map = L.map(this.mapEl.nativeElement, {
        attributionControl: true, // mandatory OSM attribution — never disabled
        zoomControl: true,
        scrollWheelZoom: true,
      });
      L.tileLayer(TILE_URL, { maxZoom: 19, attribution: ATTRIBUTION }).addTo(this.map);
      this.markersLayer = L.layerGroup().addTo(this.map);
      this.initialized = true;
      this.refreshMarkers(false);
      // Leaflet needs a valid size after the card/dialog animation finishes.
      setTimeout(() => {
        try {
          this.map?.invalidateSize();
        } catch {
          /* ignore */
        }
      }, 150);
      // Flush any focus/show-all requested before the map was ready.
      const pf = this.pendingFocusId;
      const sa = this.pendingShowAll;
      this.pendingFocusId = null;
      this.pendingShowAll = false;
      if (pf) setTimeout(() => this.focusDonor(pf), 200);
      else if (sa) setTimeout(() => this.showAll(), 200);
      this.cdr.markForCheck();
    } catch (e) {
      this.leafletError = e instanceof Error ? `${e.name}: ${e.message}` : String(e);
      this.loadError = true;
      this.cdr.markForCheck();
    }
  }

  private donorIcon(bloodGroup: unknown, focused: boolean): any {
    return L.divIcon({
      className: '',
      html: `<div class="donor-pin${focused ? ' focused' : ''}">${escapeHtml(bloodGroup || '•')}</div>`,
      iconSize: undefined,
      iconAnchor: [19, 14],
      popupAnchor: [0, -14],
    });
  }

  private refreshMarkers(fitBounds: boolean) {
    const map = this.map;
    const layer = this.markersLayer;
    if (!map || !layer) return;
    try {
      layer.clearLayers();
      this.markerById.clear();

      // The donor list already has coordinates — pass them straight to Leaflet.
      const points: Array<[number, number]> = [];
      let count = 0;
      for (const d of this.donors ?? []) {
        if (!hasCoords(d)) continue;
        const lat = Number(d.latitude);
        const lng = Number(d.longitude);
        const key = d?.id != null ? String(d.id) : '';
        const focused = !!key && key === String(this.activeFocusId ?? this.focusId ?? '');
        const marker = L.marker([lat, lng], {
          icon: this.donorIcon(d?.bloodGroup, focused),
          title: String(d?.displayName || d?.fullName || 'Donor'),
        });
        const name = escapeHtml(d?.displayName || d?.fullName || 'Donor');
        const bg = escapeHtml(d?.bloodGroup || '—');
        const loc = escapeHtml([d?.city, d?.area].filter(Boolean).join(' · ') || '—');
        const dist =
          d?.approxDistanceKm !== null && d?.approxDistanceKm !== undefined
            ? `<div>~${escapeHtml(d.approxDistanceKm)} km away</div>`
            : '';
        marker.bindPopup(
          `<div class="donor-popup"><strong>${name}</strong><div>Blood group: ${bg}</div><div>${loc}</div>${dist}</div>`,
        );
        marker.addTo(layer);
        if (d?.id) this.markerById.set(String(d.id), marker);
        points.push([lat, lng]);
        count++;
      }

      // Search-center / "my location" marker (distinct blue dot, never a donor pin).
      const cLat = toNumber(this.centerLat);
      const cLng = toNumber(this.centerLng);
      if (cLat !== null && cLng !== null && Math.abs(cLat) <= 90 && Math.abs(cLng) <= 180) {
        const me = L.marker([cLat, cLng], {
          icon: L.divIcon({ className: '', html: '<div class="me-pin">◎</div>', iconSize: undefined, iconAnchor: [15, 15] }),
          title: 'Search center',
          zIndexOffset: 500,
        });
        me.bindPopup('<div class="donor-popup"><strong>Search center</strong><div>Your current search location</div></div>');
        me.addTo(layer);
        points.push([cLat, cLng]);
      }

      this.plottedCount = count;

      if (points.length === 1) {
        // fitBounds on a single point zooms to max — use a sane street zoom instead.
        if (fitBounds || !this.viewSet) {
          map.setView(points[0], 13);
          this.viewSet = true;
        }
      } else if (points.length > 1 && (fitBounds || !this.viewSet)) {
        map.fitBounds(L.latLngBounds(points).pad(0.2));
        this.viewSet = true;
      } else if (points.length === 0) {
        // No data: neutral fallback view instead of a grey 0,0 tile.
        map.setView([20.5937, 78.9629], 5);
        this.viewSet = true;
      }
      setTimeout(() => {
        try {
          this.map?.invalidateSize();
        } catch {
          /* ignore */
        }
      }, 100);
    } catch (e) {
      this.leafletError = e instanceof Error ? `${e.name}: ${e.message}` : String(e);
      this.loadError = true;
    }
    this.cdr.markForCheck();
  }

  /** Pan to + highlight a single donor pin and open its popup. Safe to call anytime. */
  focusDonor(id: string) {
    this.activeFocusId = String(id);
    const marker = this.markerById.get(String(id));
    if (!marker || !this.map) {
      this.pendingFocusId = String(id);
      this.cdr.markForCheck();
      return;
    }
    this.pendingFocusId = null;
    const latLng = marker.getLatLng();
    try {
      this.map.setView(latLng, Math.max(this.map.getZoom(), 13), { animate: true });
    } catch {
      /* keep current view */
    }
    this.applyFocusHighlight();
    setTimeout(() => {
      try {
        marker.openPopup();
      } catch {
        /* dialog closed meanwhile */
      }
    }, 250);
  }

  /** Clear any pin highlight. */
  clearFocus() {
    this.activeFocusId = null;
    this.pendingFocusId = null;
    this.applyFocusHighlight();
  }

  /** Clear highlight and fit all current pins back into view. */
  showAll() {
    this.activeFocusId = null;
    this.applyFocusHighlight();
    if (!this.map || this.markerById.size === 0) {
      this.pendingShowAll = true;
      return;
    }
    this.pendingShowAll = false;
    const pts: Array<[number, number]> = [];
    this.markerById.forEach((m) => {
      const ll = m.getLatLng();
      pts.push([ll.lat, ll.lng]);
    });
    // Include the search center too so "view all" matches the full picture.
    const cLat = toNumber(this.centerLat);
    const cLng = toNumber(this.centerLng);
    if (cLat !== null && cLng !== null) pts.push([cLat, cLng]);
    try {
      if (pts.length === 1) {
        this.map.setView(pts[0], 13);
      } else if (pts.length > 1) {
        this.map.fitBounds(L.latLngBounds(pts).pad(0.2));
      }
      this.viewSet = true;
    } catch {
      /* keep current view */
    }
    setTimeout(() => {
      try {
        this.map?.invalidateSize();
      } catch {
        /* ignore */
      }
    }, 100);
  }

  private applyFocusHighlight() {
    const active = String(this.activeFocusId ?? this.focusId ?? '');
    for (const donor of this.donors ?? []) {
      const m = donor?.id != null ? this.markerById.get(String(donor.id)) : undefined;
      m?.setIcon(this.donorIcon(donor?.bloodGroup, donor?.id != null && String(donor.id) === active && active !== ''));
    }
  }
}
