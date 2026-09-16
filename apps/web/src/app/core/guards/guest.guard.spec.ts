import { TestBed } from '@angular/core/testing';
import { guestGuard } from './guest.guard';
import { AuthService } from '../services/auth.service';
import { Router } from '@angular/router';

describe('guestGuard', () => {
  let authMock: any;
  let routerMock: any;

  beforeEach(() => {
    authMock = { ensureInitialized: jest.fn().mockResolvedValue(undefined), isAuthenticated: jest.fn(), user: jest.fn() };
    routerMock = { navigate: jest.fn(), navigateByUrl: jest.fn() };
    TestBed.configureTestingModule({ providers: [{ provide: AuthService, useValue: authMock }, { provide: Router, useValue: routerMock }] });
  });

  it('allows anonymous to proceed', async () => {
    authMock.isAuthenticated.mockReturnValue(false);
    const result = await TestBed.runInInjectionContext(() => guestGuard({ queryParams: {} } as any, {} as any));
    expect(result).toBe(true);
  });

  it('redirects authenticated USER to /dashboard when no safe returnUrl', async () => {
    authMock.isAuthenticated.mockReturnValue(true);
    authMock.user.mockReturnValue({ role: 'USER' });
    const result = await TestBed.runInInjectionContext(() => guestGuard({ queryParams: {} } as any, {} as any));
    expect(result).toBe(false);
    expect(routerMock.navigate).toHaveBeenCalledWith(['/dashboard']);
  });

  it('redirects authenticated ADMIN to /admin/dashboard', async () => {
    authMock.isAuthenticated.mockReturnValue(true);
    authMock.user.mockReturnValue({ role: 'ADMIN' });
    const result = await TestBed.runInInjectionContext(() => guestGuard({ queryParams: {} } as any, {} as any));
    expect(result).toBe(false);
    expect(routerMock.navigate).toHaveBeenCalledWith(['/admin/dashboard']);
  });

  it('uses safe returnUrl when provided and allowed', async () => {
    authMock.isAuthenticated.mockReturnValue(true);
    authMock.user.mockReturnValue({ role: 'USER' });
    const result = await TestBed.runInInjectionContext(() => guestGuard({ queryParams: { returnUrl: '/donors' } } as any, {} as any));
    expect(result).toBe(false);
    expect(routerMock.navigateByUrl).toHaveBeenCalledWith('/donors');
  });

  it('blocks returnUrl that is auth page even if requested', async () => {
    authMock.isAuthenticated.mockReturnValue(true);
    authMock.user.mockReturnValue({ role: 'USER' });
    const result = await TestBed.runInInjectionContext(() => guestGuard({ queryParams: { returnUrl: '/login' } } as any, {} as any));
    expect(result).toBe(false);
    expect(routerMock.navigate).toHaveBeenCalledWith(['/dashboard']);
    expect(routerMock.navigateByUrl).not.toHaveBeenCalled();
  });

  it('blocks admin returnUrl for non-admin user', async () => {
    authMock.isAuthenticated.mockReturnValue(true);
    authMock.user.mockReturnValue({ role: 'USER' });
    const result = await TestBed.runInInjectionContext(() => guestGuard({ queryParams: { returnUrl: '/admin/dashboard' } } as any, {} as any));
    expect(result).toBe(false);
    expect(routerMock.navigate).toHaveBeenCalledWith(['/dashboard']);
  });

  it('blocks protocol-relative URLs', async () => {
    authMock.isAuthenticated.mockReturnValue(true);
    authMock.user.mockReturnValue({ role: 'USER' });
    const result = await TestBed.runInInjectionContext(() => guestGuard({ queryParams: { returnUrl: '//evil.com' } } as any, {} as any));
    expect(routerMock.navigateByUrl).not.toHaveBeenCalled();
    expect(routerMock.navigate).toHaveBeenCalledWith(['/dashboard']);
  });
});
