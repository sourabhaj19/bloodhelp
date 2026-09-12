import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { guestGuard } from './core/guards/guest.guard';
import { roleGuard } from './core/guards/role.guard';

export const routes: Routes = [
  // ── Public — PublicLayout ──────────────────────────────────────────────
  {
    path: '',
    loadComponent: () =>
      import('./layout/public-layout/public-layout.component').then((m) => m.PublicLayoutComponent),
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./features/public/home.component').then((m) => m.HomeComponent),
      },
      {
        path: 'about',
        loadComponent: () =>
          import('./features/public/about.component').then((m) => m.AboutComponent),
      },
      {
        path: 'contact',
        loadComponent: () =>
          import('./features/public/contact.component').then((m) => m.ContactComponent),
      },
      {
        path: 'blood-information',
        loadComponent: () =>
          import('./features/public/blood-information.component').then(
            (m) => m.BloodInformationComponent,
          ),
      },
      {
        path: 'search',
        loadComponent: () =>
          import('./features/public/public-search.component').then((m) => m.PublicSearchComponent),
      },
      {
        path: 'login',
        canActivate: [guestGuard],
        loadComponent: () =>
          import('./features/auth/login.component').then((m) => m.LoginComponent),
      },
      {
        path: 'register',
        canActivate: [guestGuard],
        loadComponent: () =>
          import('./features/auth/register.component').then((m) => m.RegisterComponent),
      },
      {
        path: 'forgot-password',
        canActivate: [guestGuard],
        loadComponent: () =>
          import('./features/auth/forgot-password.component').then(
            (m) => m.ForgotPasswordComponent,
          ),
      },
      {
        path: 'reset-password',
        canActivate: [guestGuard],
        loadComponent: () =>
          import('./features/auth/reset-password.component').then(
            (m) => m.ResetPasswordComponent,
          ),
      },
      {
        path: 'verify-email',
        loadComponent: () =>
          import('./features/auth/verify-email.component').then(
            (m) => m.VerifyEmailComponent,
          ),
      },
    ],
  },

  // ── Authenticated — UserLayout [AuthGuard] ─────────────────────────────
  {
    path: '',
    loadComponent: () =>
      import('./layout/user-layout/user-layout.component').then((m) => m.UserLayoutComponent),
    canActivate: [authGuard],
    children: [
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./features/dashboard/dashboard.component').then((m) => m.DashboardComponent),
      },
      {
        path: 'donors',
        loadComponent: () =>
          import('./features/donors/donors.component').then((m) => m.DonorsComponent),
      },
      {
        path: 'appreciations',
        loadComponent: () =>
          import('./features/appreciations/appreciations.component').then(
            (m) => m.AppreciationsComponent,
          ),
      },
      {
        path: 'profile',
        loadComponent: () =>
          import('./features/profile/profile.component').then((m) => m.ProfileComponent),
      },
      {
        path: 'change-password',
        loadComponent: () =>
          import('./features/profile/change-password.component').then((m) => m.ChangePasswordComponent),
      },
      {
        path: 'notifications',
        loadComponent: () =>
          import('./features/notifications/notifications.component').then(
            (m) => m.NotificationsComponent,
          ),
      },
      {
        path: 'reports',
        loadComponent: () =>
          import('./features/reports/my-reports.component').then(
            (m) => m.MyReportsComponent,
          ),
      },
    ],
  },

  // ── Admin — AdminLayout [AuthGuard, RoleGuard(['ADMIN'])] ──────────────
  {
    path: 'admin',
    loadComponent: () =>
      import('./layout/admin-layout/admin-layout.component').then((m) => m.AdminLayoutComponent),
    canActivate: [authGuard, roleGuard(['ADMIN'])],
    children: [
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./features/admin/dashboard/admin-dashboard.component').then(
            (m) => m.AdminDashboardComponent,
          ),
      },
      {
        path: 'profile',
        loadComponent: () =>
          import('./features/admin/master-data/admin-profile.component').then(
            (m) => m.AdminProfileComponent,
          ),
      },
      {
        path: 'users',
        loadComponent: () =>
          import('./features/admin/users/admin-users.component').then(
            (m) => m.AdminUsersComponent,
          ),
      },
      {
        path: 'reports',
        loadComponent: () =>
          import('./features/admin/reports/admin-reports.component').then(
            (m) => m.AdminReportsComponent,
          ),
      },
      {
        path: 'master-data/blood-groups',
        loadComponent: () =>
          import('./features/admin/master-data/blood-groups.component').then(
            (m) => m.MasterBloodGroupsComponent,
          ),
      },
      {
        path: 'master-data/country-codes',
        loadComponent: () =>
          import('./features/admin/master-data/country-codes.component').then(
            (m) => m.MasterCountryCodesComponent,
          ),
      },
      {
        path: 'master-data/countries',
        loadComponent: () =>
          import('./features/admin/master-data/countries.component').then(
            (m) => m.MasterCountriesComponent,
          ),
      },
      {
        path: 'master-data/states',
        loadComponent: () =>
          import('./features/admin/master-data/states.component').then(
            (m) => m.MasterStatesComponent,
          ),
      },
      {
        path: 'master-data/cities',
        loadComponent: () =>
          import('./features/admin/master-data/cities.component').then(
            (m) => m.MasterCitiesComponent,
          ),
      },
      {
        path: 'email-templates',
        loadComponent: () =>
          import('./features/admin/email-templates/email-templates.component').then(
            (m) => m.EmailTemplatesComponent,
          ),
      },
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
    ],
  },

  // ── Fallback ───────────────────────────────────────────────────────────
  {
    path: '**',
    loadComponent: () =>
      import('./shared/components/not-found.component').then((m) => m.NotFoundComponent),
  },
];
