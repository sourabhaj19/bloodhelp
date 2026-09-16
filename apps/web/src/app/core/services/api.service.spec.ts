import { TestBed } from '@angular/core/testing';
import { ApiService } from './api.service';
import { HttpClient, provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

describe('ApiService', () => {
  let service: ApiService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(ApiService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('creates service', () => {
    expect(service).toBeTruthy();
  });

  it('get prefixes with /api and passes params', () => {
    service.get('/donors', { page: 1 }).subscribe();
    const req = httpMock.expectOne(r => r.url === '/api/donors');
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('page')).toBe('1');
    expect(req.request.withCredentials).toBe(true);
    req.flush({});
  });

  it('post sends body to /api/*', () => {
    service.post('/auth/login', { identifier: 'a', password: 'b' }).subscribe();
    const req = httpMock.expectOne('/api/auth/login');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ identifier: 'a', password: 'b' });
    req.flush({});
  });

  it('patch sends body', () => {
    service.patch('/users/me', { firstName: 'Alex' }).subscribe();
    const req = httpMock.expectOne('/api/users/me');
    expect(req.request.method).toBe('PATCH');
    req.flush({});
  });

  it('delete calls /api/*', () => {
    service.delete('/admin/users/1').subscribe();
    const req = httpMock.expectOne('/api/admin/users/1');
    expect(req.request.method).toBe('DELETE');
    req.flush({});
  });
});
