import {
  Injectable,
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { EmailTemplateService } from '../mail/email-template.service';

@Injectable()
export class AppreciationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly templates: EmailTemplateService,
  ) {}

  async give(senderUserId: string, receiverUserId: string, message?: string) {
    if (senderUserId === receiverUserId) {
      throw new BadRequestException({ code: 'APPRECIATION_SELF', message: 'Cannot appreciate yourself' });
    }
    const receiver = await this.prisma.user.findUnique({ where: { id: receiverUserId } });
    if (!receiver || receiver.deletedAt || !receiver.active) {
      throw new NotFoundException({ code: 'USER_NOT_FOUND', message: 'Receiver not found' });
    }

    // Anti-spam: one per sender→receiver per 24h (§11)
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recent = await this.prisma.appreciation.findFirst({
      where: { senderUserId, receiverUserId, createdAt: { gte: since } },
    });
    if (recent) {
      throw new ConflictException({ code: 'APPRECIATION_DUPLICATE', message: 'You have already appreciated this donor within the last 24 hours' });
    }

    const appreciation = await this.prisma.appreciation.create({
      data: { senderUserId, receiverUserId, message },
    });

    // Notification fan-out (sync for now; Phase 7 would be BullMQ)
    const sender = await this.prisma.user.findUnique({ where: { id: senderUserId } });
    await this.prisma.notification.create({
      data: {
        userId: receiverUserId,
        type: 'APPRECIATION_RECEIVED',
        title: 'You received appreciation',
        message: `${sender?.firstName ?? 'Someone'} appreciated you${message ? `: "${message}"` : ''}`,
        referenceType: 'APPRECIATION',
        referenceId: appreciation.id,
      },
    });
    void this.templates.sendForType('APPRECIATION_RECEIVED', receiver.email, {
      firstName: receiver.firstName,
      senderName: `${sender?.firstName ?? 'Someone'} ${sender?.lastName ?? ''}`.trim(),
      message: message || '',
    });

    return appreciation;
  }

  async listReceived(userId: string, page = 1, pageSize = 20) {
    const skip = (page - 1) * pageSize;
    const [total, items] = await Promise.all([
      this.prisma.appreciation.count({ where: { receiverUserId: userId } }),
      this.prisma.appreciation.findMany({
        where: { receiverUserId: userId },
        include: { sender: { select: { id: true, firstName: true, lastName: true } } },
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize,
      }),
    ]);
    return { items, page, pageSize, total, totalPages: Math.ceil(total / pageSize) };
  }

  async listGiven(userId: string, page = 1, pageSize = 20) {
    const skip = (page - 1) * pageSize;
    const [total, items] = await Promise.all([
      this.prisma.appreciation.count({ where: { senderUserId: userId } }),
      this.prisma.appreciation.findMany({
        where: { senderUserId: userId },
        include: { receiver: { select: { id: true, firstName: true, lastName: true } } },
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize,
      }),
    ]);
    return { items, page, pageSize, total, totalPages: Math.ceil(total / pageSize) };
  }
}
