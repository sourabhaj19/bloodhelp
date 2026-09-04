import { Module } from '@nestjs/common';
import { AdminService } from './admin.service';
import { AdminController } from './admin.controller';
import { ReportsModule } from '../reports/reports.module';
import { DashboardModule } from '../dashboard/dashboard.module';

@Module({
  imports: [ReportsModule, DashboardModule],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
