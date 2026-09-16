import { TestBed } from '@angular/core/testing';
import { roleGuard } from './role.guard';
import { AuthService } from '../services/auth.service';
import { Router } from '@angular/router';

describe('roleGuard', () => {
  let authMock: any;
  let routerMock: any;

  beforeEach(() => {
    authMock = { ensureInitialized: jest.fn().mockResolvedValue(undefined), isAuthenticated: jest.fn(), user: jest.fn() };
    routerMock = { navigate: jest.fn() };
    TestBed.configureTestingModule({ providers: [{ provide: AuthService, useValue: authMock }, { provide: Router, useValue: routerMock }] });
  });

  it('redirects to login when not authenticated', async () => {
    authMock.isAuthenticated.mockReturnValue(false);
    const guard = roleGuard(['ADMIN']);
    const result = await TestBed.runInInjectionContext(() => guard({} as any, { url: '/admin/users' } as any));
    expect(result).toBe(false);
    expect(routerMock.navigate).toHaveBeenCalledWith(['/login'], { queryParams: { returnUrl: '/admin/users' } });
  });

  it('allows when user role matches allowed', async () => {
    authMock.isAuthenticated.mockReturnValue(true);
    authMock.user.mockReturnValue({ role: 'ADMIN' });
    const guard = roleGuard(['ADMIN']);
    const result = await TestBed.runInInjectionContext(() => guard({} as any, { url: '/admin/dashboard' } as any));
    expect(result).toBe(true);
  });

  it('redirects to /dashboard when role not allowed', async () => {
    authMock.isAuthenticated.mockReturnValue(true);
    authMock.user.mockReturnValue({ role: 'USER' });
    const guard = roleGuard(['ADMIN']);
    const result = await TestBed.runInInjectionContext(() => guard({} as any, { url: '/admin/dashboard' } as any));
    expect(result).toBe(false);
    expect(routerMock.navigate).toHaveBeenCalledWith(['/dashboard']);
  });

  it('allows USER role when allowed includes USER', async () => {
    authMock.isAuthenticated.mockReturnValue(true);
    authMock.user.mockReturnValue({ role: 'USER' });
    const guard = roleGuard(['USER', 'ADMIN']);
    const result = await TestBed.runInInjectionContext(() => guard({} as any, { url: '/dashboard' } as any));
    expect(result).toBe(true);
  });
});
