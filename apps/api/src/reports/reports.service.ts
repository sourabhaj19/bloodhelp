import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(reporterId: string, reportedUserId: string, reasonId: string, description?: string) {
    if (reporterId === reportedUserId) {
      throw new BadRequestException({ code: 'REPORT_SELF', message: 'Cannot report yourself' });
    }
    const [reportedUser, reason] = await Promise.all([
      this.prisma.user.findUnique({ where: { id: reportedUserId } }),
      this.prisma.reportReason.findUnique({ where: { id: reasonId } }),
    ]);
    if (!reportedUser || reportedUser.deletedAt) throw new NotFoundException({ code: 'USER_NOT_FOUND', message: 'Reported user not found' });
    if (!reason || !reason.active) throw new BadRequestException({ code: 'INVALID_REASON', message: 'Invalid report reason' });

    // Rate limit / duplicate suppression: block duplicate open report same reason within 24h?
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const dup = await this.prisma.userReport.findFirst({
      where: { reportedByUserId: reporterId, reportedUserId, reasonId, createdAt: { gte: since } },
    });
    if (dup) throw new BadRequestException({ code: 'REPORT_DUPLICATE', message: 'You have already reported this user for this reason recently' });

    const report = await this.prisma.userReport.create({
      data: { reportedByUserId: reporterId, reportedUserId, reasonId, description },
    });

    // Notify admins via notification (for each admin)
    const admins = await this.prisma.user.findMany({ where: { role: 'ADMIN', active: true, deletedAt: null }, select: { id: true } });
    for (const admin of admins) {
      await this.prisma.notification.create({
        data: {
          userId: admin.id,
          type: 'REPORT_CREATED',
          title: 'New user report',
          message: `New report filed against user ${reportedUserId}`,
          referenceType: 'REPORT',
          referenceId: report.id,
        },
      });
    }

    await this.prisma.auditLog.create({
      data: {
        actorUserId: reporterId,
        action: 'CREATE',
        entityType: 'UserReport',
        entityId: report.id,
        newValue: report as any,
      },
    });

    return report;
  }

  async listReasons() {
    return this.prisma.reportReason.findMany({
      where: { active: true },
      orderBy: { label: 'asc' },
    });
  }

  /** Reports filed BY a user — brief view, adminComment stays internal. */
  async listMine(reporterId: string) {
    return this.prisma.userReport.findMany({
      where: { reportedByUserId: reporterId },
      select: {
        id: true,
        status: true,
        description: true,
        createdAt: true,
        updatedAt: true,
        reason: { select: { id: true, code: true, label: true } },
        reportedUser: { select: { id: true, firstName: true, lastName: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getOneMine(id: string, reporterId: string) {
    const report = await this.prisma.userReport.findUnique({
      where: { id },
      select: {
        id: true,
        status: true,
        description: true,
        createdAt: true,
        updatedAt: true,
        reportedByUserId: true,
        reason: { select: { id: true, code: true, label: true } },
        reportedUser: { select: { id: true, firstName: true, lastName: true } },
      },
    });
    if (!report) throw new NotFoundException({ code: 'REPORT_NOT_FOUND', message: 'Report not found' });
    if (report.reportedByUserId !== reporterId) {
      throw new ForbiddenException({ code: 'FORBIDDEN', message: 'Not your report' });
    }
    const { reportedByUserId: _omit, ...brief } = report;
    return brief;
  }

  // Admin methods
  async listAdmin(page = 1, pageSize = 20, status?: string) {
    const skip = (page - 1) * pageSize;
    const where: any = {};
    if (status) where.status = status;
    const [total, items] = await Promise.all([
      this.prisma.userReport.count({ where }),
      this.prisma.userReport.findMany({
        where,
        include: {
          reportedBy: { select: { id: true, firstName: true, lastName: true, email: true } },
          reportedUser: { select: { id: true, firstName: true, lastName: true, email: true } },
          reason: true,
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize,
      }),
    ]);
    return { items, page, pageSize, total, totalPages: Math.ceil(total / pageSize) };
  }

  async getOneAdmin(id: string) {
    const report = await this.prisma.userReport.findUnique({
      where: { id },
      include: {
        reportedBy: { select: { id: true, firstName: true, lastName: true, email: true } },
        reportedUser: { select: { id: true, firstName: true, lastName: true, email: true } },
        reason: true,
      },
    });
    if (!report) throw new NotFoundException({ code: 'REPORT_NOT_FOUND', message: 'Report not found' });
    return report;
  }

  async updateStatusAdmin(id: string, status: string, adminComment: string | undefined, actorId: string, meta: { ip?: string; userAgent?: string }) {
    const allowed = ['OPEN', 'UNDER_REVIEW', 'RESOLVED', 'REJECTED'];
    if (!allowed.includes(status)) throw new BadRequestException({ code: 'INVALID_STATUS', message: 'Invalid report status' });
    const existing = await this.prisma.userReport.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException({ code: 'REPORT_NOT_FOUND', message: 'Report not found' });
    const oldValue = { status: existing.status, adminComment: existing.adminComment };
    const updated = await this.prisma.userReport.update({
      where: { id },
      data: { status: status as any, adminComment },
    });
    await this.prisma.auditLog.create({
      data: {
        actorUserId: actorId,
        action: 'STATUS_CHANGE',
        entityType: 'UserReport',
        entityId: id,
        oldValue: oldValue as any,
        newValue: { status, adminComment } as any,
        ipAddress: meta.ip,
        userAgent: meta.userAgent,
      },
    });
    // Notify reporter about status change
    await this.prisma.notification.create({
      data: {
        userId: existing.reportedByUserId,
        type: 'REPORT_STATUS_CHANGED',
        title: 'Report status updated',
        message: `Your report ${id} status changed to ${status}`,
        referenceType: 'REPORT',
        referenceId: id,
      },
    });
    return updated;
  }
}
