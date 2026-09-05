import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HealthModule } from './health/health.module';
import { DatabaseModule } from './database/database.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { DonorsModule } from './donors/donors.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { AppreciationsModule } from './appreciations/appreciations.module';
import { NotificationsModule } from './notifications/notifications.module';
import { ReportsModule } from './reports/reports.module';
import { MasterDataModule } from './master-data/master-data.module';
import { AdminModule } from './admin/admin.module';
import { AuditModule } from './audit/audit.module';
import { GeocodingModule } from './geocoding/geocoding.module';
import { MailModule } from './mail/mail.module';
import { ContactModule } from './contact/contact.module';
import appConfig from './config/app.config';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: ['../../.env', '.env'], load: [appConfig] }),
    DatabaseModule,
    HealthModule,
    AuthModule,
    UsersModule,
    DonorsModule,
    DashboardModule,
    AppreciationsModule,
    NotificationsModule,
    ReportsModule,
    MasterDataModule,
    AdminModule,
    AuditModule,
    GeocodingModule,
    MailModule,
    ContactModule,
  ],
})
export class AppModule {}
