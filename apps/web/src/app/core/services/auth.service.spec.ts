import { TestBed } from '@angular/core/testing';
import { AuthService } from './auth.service';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Router } from '@angular/router';

describe('AuthService (signals & session)', () => {
  let service: AuthService;
  let httpMock: HttpTestingController;
  let routerSpy: any;

  beforeEach(() => {
    routerSpy = { navigate: jest.fn(), url: '/dashboard' };
    // Provide AuthService with HttpClient + mocked Router
    TestBed.configureTestingModule({
      providers: [AuthService, provideHttpClient(), provideHttpClientTesting(), { provide: Router, useValue: routerSpy }],
    });
    service = TestBed.inject(AuthService);
    httpMock = TestBed.inject(HttpTestingController);
    // ensure clean signals between tests
    service.clearSession();
    // reset initialized to false for each test where needed
    (service as any)._initialized.set(false);
  });

  afterEach(() => httpMock.verify());

  it('creates service with initial state unauthenticated', () => {
    expect(service).toBeTruthy();
    expect(service.isAuthenticated()).toBe(false);
    expect(service.isAdmin()).toBe(false);
    expect(service.user()).toBeNull();
    expect(service.accessToken()).toBeNull();
  });

  it('setSession sets token, user and authenticated computed', () => {
    const user = { id: '1', firstName: 'Alex', lastName: 'Doe', role: 'USER' as const, email: 'a@b.com' };
    service.setSession('tok123', user as any);
    expect(service.accessToken()).toBe('tok123');
    expect(service.user()).toEqual(user);
    expect(service.isAuthenticated()).toBe(true);
    expect(service.isAdmin()).toBe(false);
    expect(service.initialized()).toBe(true);
  });

  it('isAdmin computed reflects role', () => {
    service.setSession('t', { id: '1', firstName: 'A', lastName: 'B', role: 'ADMIN', email: 'a@b.com' } as any);
    expect(service.isAdmin()).toBe(true);
    service.clearSession();
    expect(service.isAdmin()).toBe(false);
  });

  it('clearSession resets token and user', () => {
    service.setSession('t', { id: '1', firstName: 'A', lastName: 'B', role: 'USER', email: 'a@b.com' } as any);
    service.clearSession();
    expect(service.accessToken()).toBeNull();
    expect(service.user()).toBeNull();
    expect(service.isAuthenticated()).toBe(false);
  });

  it('login stores session from /api/auth/login response (res.data variant)', async () => {
    const mockRes = { data: { accessToken: 'newTok', user: { id: 'u1', firstName: 'Alex', role: 'USER', email: 'a@b.com', lastName: 'Doe' } } };
    const p = service.login('user@example.com', 'Strong!Pass', false);
    const req = httpMock.expectOne('/api/auth/login');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ identifier: 'user@example.com', password: 'Strong!Pass', rememberMe: false });
    req.flush(mockRes);
    await p;
    expect(service.accessToken()).toBe('newTok');
    expect(service.user()?.id).toBe('u1');
  });

  it('login handles flat response (res.accessToken)', async () => {
    const mockRes: any = { accessToken: 'flatTok', user: { id: 'u2', firstName: 'Sam', lastName: 'Lee', role: 'ADMIN', email: 'sam@b.com' } };
    const p = service.login('sam', 'pass', true);
    const req = httpMock.expectOne('/api/auth/login');
    req.flush(mockRes);
    await p;
    expect(service.accessToken()).toBe('flatTok');
    expect(service.isAdmin()).toBe(true);
  });

  it('logout clears session and navigates to /login even if http fails', async () => {
    service.setSession('t', { id: '1', firstName: 'A', lastName: 'B', role: 'USER', email: 'a@b.com' } as any);
    const p = service.logout();
    const req = httpMock.expectOne('/api/auth/logout');
    req.flush(null, { status: 500, statusText: 'Server Error' });
    try {
      await p;
    } catch {
      // logout propagates http error after finally — still should have cleared session
    }
    expect(service.isAuthenticated()).toBe(false);
    expect(routerSpy.navigate).toHaveBeenCalledWith(['/login']);
  });

  it('refresh sets token and returns it on success', async () => {
    const p = service.refresh();
    const req = httpMock.expectOne('/api/auth/refresh');
    req.flush({ data: { accessToken: 'refreshed', user: { id: 'u1', firstName: 'A', role: 'USER' } } });
    const token = await p;
    expect(token).toBe('refreshed');
    expect(service.accessToken()).toBe('refreshed');
  });

  it('refresh clears session and returns null on failure', async () => {
    service.setSession('old', { id: '1', firstName: 'A', lastName: 'B', role: 'USER', email: 'a@b.com' } as any);
    const p = service.refresh();
    const req = httpMock.expectOne('/api/auth/refresh');
    req.flush(null, { status: 401, statusText: 'Unauthorized' });
    const token = await p;
    expect(token).toBeNull();
    expect(service.isAuthenticated()).toBe(false);
  });

  it('ensureInitialized triggers restoreSession only once', async () => {
    const refreshSpy = jest.spyOn(service as any, 'restoreSession').mockResolvedValue(undefined);
    const p1 = service.ensureInitialized();
    const p2 = service.ensureInitialized();
    await Promise.all([p1, p2]);
    expect(refreshSpy).toHaveBeenCalledTimes(1);
    refreshSpy.mockRestore();
  });

  it('changePassword updates token when provided', async () => {
    service.setSession('old', { id: '1', firstName: 'A', lastName: 'B', role: 'USER', email: 'a@b.com' } as any);
    const p = service.changePassword('oldPass', 'New!Pass1', 'New!Pass1');
    const req = httpMock.expectOne('/api/auth/change-password');
    req.flush({ data: { accessToken: 'newAfterChange' } });
    const tok = await p;
    expect(tok).toBe('newAfterChange');
    expect(service.accessToken()).toBe('newAfterChange');
  });
});
