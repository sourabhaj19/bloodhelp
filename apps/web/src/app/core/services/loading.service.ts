import { Injectable, signal, computed } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class LoadingService {
  private _loadingCount = signal(0);
  
  readonly isLoading = computed(() => this._loadingCount() > 0);
  readonly loadingCount = computed(() => this._loadingCount());

  show(): void {
    this._loadingCount.update(count => count + 1);
  }

  hide(): void {
    this._loadingCount.update(count => Math.max(0, count - 1));
  }

  reset(): void {
    this._loadingCount.set(0);
  }
}