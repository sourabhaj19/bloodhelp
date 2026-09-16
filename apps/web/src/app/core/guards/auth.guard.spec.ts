import { TestBed } from '@angular/core/testing';
import { authGuard } from './auth.guard';
import { AuthService } from '../services/auth.service';
import { Router } from '@angular/router';

describe('authGuard', () => {
  let authMock: any;
  let routerMock: any;

  beforeEach(() => {
    authMock = { ensureInitialized: jest.fn().mockResolvedValue(undefined), isAuthenticated: jest.fn() };
    routerMock = { navigate: jest.fn() };
    TestBed.configureTestingModule({ providers: [{ provide: AuthService, useValue: authMock }, { provide: Router, useValue: routerMock }] });
  });

  it('returns true when authenticated', async () => {
    authMock.isAuthenticated.mockReturnValue(true);
    const result = await TestBed.runInInjectionContext(() => authGuard({} as any, { url: '/dashboard' } as any));
    expect(result).toBe(true);
    expect(authMock.ensureInitialized).toHaveBeenCalled();
    expect(routerMock.navigate).not.toHaveBeenCalled();
  });

  it('redirects to /login with returnUrl when not authenticated', async () => {
    authMock.isAuthenticated.mockReturnValue(false);
    const result = await TestBed.runInInjectionContext(() => authGuard({} as any, { url: '/donors?search=abc' } as any));
    expect(result).toBe(false);
    expect(routerMock.navigate).toHaveBeenCalledWith(['/login'], { queryParams: { returnUrl: '/donors?search=abc' } });
  });

  it('awaits ensureInitialized before checking auth', async () => {
    let initialized = false;
    authMock.ensureInitialized.mockImplementation(() => new Promise<void>(resolve => setTimeout(() => { initialized = true; resolve(); }, 10)));
    authMock.isAuthenticated.mockImplementation(() => initialized);
    const result = await TestBed.runInInjectionContext(() => authGuard({} as any, { url: '/profile' } as any));
    expect(initialized).toBe(true);
    expect(result).toBe(true);
  });
});
