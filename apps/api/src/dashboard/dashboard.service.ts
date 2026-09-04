import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getUserDashboard(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new Error('User not found');

    const [totalDonorsNearby, myAppreciationsReceived, myAppreciationsGiven, unreadNotifications] = await Promise.all([
      // Count active donors in same city as a proxy for "nearby" without PostGIS (quick dashboard stat)
      this.prisma.user.count({ where: { active: true, deletedAt: null, cityId: user.cityId } }),
      this.prisma.appreciation.count({ where: { receiverUserId: userId } }),
      this.prisma.appreciation.count({ where: { senderUserId: userId } }),
      this.prisma.notification.count({ where: { userId, isRead: false } }),
    ]);

    return {
      myLocation: { cityId: user.cityId, area: user.area, latitude: Number(user.latitude), longitude: Number(user.longitude) },
      stats: { totalDonorsNearby, myAppreciationsReceived, myAppreciationsGiven, unreadNotifications },
    };
  }

  async getAdminDashboard() {
    const [
      totalUsers,
      activeUsers,
      totalDonors,
      totalReportsOpen,
      totalReports,
      bloodGroupStats,
      recentUsers,
      recentReports,
    ] = await Promise.all([
      this.prisma.user.count({ where: { deletedAt: null } }),
      this.prisma.user.count({ where: { active: true, deletedAt: null } }),
      this.prisma.user.count({ where: { active: true, deletedAt: null } }),
      this.prisma.userReport.count({ where: { status: 'OPEN' } }),
      this.prisma.userReport.count(),
      this.prisma.user.groupBy({ by: ['bloodGroupId'], _count: true, where: { deletedAt: null } }),
      this.prisma.user.findMany({ orderBy: { createdAt: 'desc' }, take: 5, select: { id: true, firstName: true, lastName: true, email: true, createdAt: true } }),
      this.prisma.userReport.findMany({ orderBy: { createdAt: 'desc' }, take: 5, include: { reason: true } }),
    ]);

    // Enrich bloodGroupStats with labels
    const bgIds = bloodGroupStats.map((g) => g.bloodGroupId);
    const bloodGroups = bgIds.length ? await this.prisma.bloodGroup.findMany({ where: { id: { in: bgIds } } }) : [];
    const bgMap = new Map(bloodGroups.map((b) => [b.id, b.code]));

    const bloodGroupBreakdown = bloodGroupStats.map((g) => ({
      bloodGroupId: g.bloodGroupId,
      bloodGroupCode: bgMap.get(g.bloodGroupId) ?? 'Unknown',
      count: g._count,
    }));

    return {
      totals: { totalUsers, activeUsers, totalDonors, totalReports, totalReportsOpen },
      bloodGroupBreakdown,
      recentUsers,
      recentReports,
    };
  }
}
