import { LoadingService } from './loading.service';

describe('LoadingService', () => {
  let service: LoadingService;

  beforeEach(() => {
    service = new LoadingService();
  });

  it('starts not loading', () => {
    expect(service.isLoading()).toBe(false);
    expect(service.loadingCount()).toBe(0);
  });

  it('show increments count and sets isLoading true', () => {
    service.show();
    expect(service.isLoading()).toBe(true);
    expect(service.loadingCount()).toBe(1);
    service.show();
    expect(service.loadingCount()).toBe(2);
  });

  it('hide decrements but never below 0', () => {
    service.show();
    service.show();
    service.hide();
    expect(service.loadingCount()).toBe(1);
    expect(service.isLoading()).toBe(true);
    service.hide();
    expect(service.loadingCount()).toBe(0);
    expect(service.isLoading()).toBe(false);
    service.hide(); // extra hide
    expect(service.loadingCount()).toBe(0);
    expect(service.isLoading()).toBe(false);
  });

  it('reset clears to zero regardless of count', () => {
    service.show();
    service.show();
    service.show();
    service.reset();
    expect(service.loadingCount()).toBe(0);
    expect(service.isLoading()).toBe(false);
  });

  it('handles mixed show/hide sequences', () => {
    service.show();
    service.hide();
    service.show();
    expect(service.isLoading()).toBe(true);
    service.hide();
    expect(service.isLoading()).toBe(false);
  });
});
