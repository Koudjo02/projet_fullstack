import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';

@Injectable()
export class TournamentsAdminService {
  constructor(private prisma: PrismaService) {}

  // Liste les tournois publics en attente de validation
  async findPendingApproval() {
    return this.prisma.tournament.findMany({
      where: { isPublic: true, isApproved: false, deletedAt: null },
      orderBy: { createdAt: 'asc' },
      include: {
        admin: { select: { id: true, username: true, name: true, email: true } },
      },
    });
  }

  async approve(id: number) {
    const tournament = await this.prisma.tournament.findUnique({ where: { id } });
    if (!tournament || tournament.deletedAt) {
      throw new NotFoundException('Tournoi introuvable');
    }
    return this.prisma.tournament.update({ where: { id }, data: { isApproved: true } });
  }

  async reject(id: number) {
    const tournament = await this.prisma.tournament.findUnique({ where: { id } });
    if (!tournament || tournament.deletedAt) {
      throw new NotFoundException('Tournoi introuvable');
    }
    return this.prisma.tournament.update({ where: { id }, data: { isApproved: false } });
  }
}
