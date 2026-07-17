import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { randomBytes } from 'crypto';
import { PrismaService } from '../prisma.service';
import { CreateTournamentDto } from './dto/create-tournament.dto';

@Injectable()
export class TournamentsService {
  constructor(private prisma: PrismaService) {}

  // Génère un code d'invitation unique et lisible (12 caractères hexadécimaux)
  private generateInviteCode(): string {
    return randomBytes(6).toString('hex');
  }

  // Crée un tournoi, l'utilisateur connecté en devient automatiquement l'admin
  async create(adminId: number, dto: CreateTournamentDto) {
    return this.prisma.tournament.create({
      data: {
        name: dto.name,
        inviteCode: this.generateInviteCode(),
        adminId,
      },
    });
  }

  // Liste les tournois où l'utilisateur est soit admin, soit participant
  async findAllForUser(userId: number) {
    return this.prisma.tournament.findMany({
      where: {
        OR: [
          { adminId: userId },
          { participants: { some: { userId } } },
        ],
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // Récupère le détail complet d'un tournoi (participants, équipes)
  async findOne(id: number) {
    const tournament = await this.prisma.tournament.findUnique({
      where: { id },
      include: {
        participants: {
          include: {
            user: {
              select: { id: true, username: true, name: true, avatarUrl: true },
            },
          },
        },
        teams: true,
      },
    });

    if (!tournament) {
      throw new NotFoundException('Tournoi introuvable');
    }

    return tournament;
  }

  // Supprime un tournoi (admin uniquement, cascade sur tout le reste grâce au schéma)
  async remove(id: number, requesterId: number) {
    const tournament = await this.prisma.tournament.findUnique({
      where: { id },
    });

    if (!tournament) {
      throw new NotFoundException('Tournoi introuvable');
    }

    // Vérifie que seul l'admin du tournoi peut le supprimer
    if (tournament.adminId !== requesterId) {
      throw new ForbiddenException(
        'Seul l\'administrateur du tournoi peut le supprimer',
      );
    }

    return this.prisma.tournament.delete({ where: { id } });
  }

  // Désigne un participant comme capitaine (admin uniquement)
 // Promeut un participant en CAPTAIN ou COACH (admin uniquement)
// Promeut un participant en CAPTAIN ou COACH (admin uniquement)
async promoteParticipant(
  tournamentId: number,
  targetUserId: number,
  requesterId: number,
  role: 'CAPTAIN' | 'COACH',
) {
  const tournament = await this.prisma.tournament.findUnique({
    where: { id: tournamentId },
  });

  if (!tournament) {
    throw new NotFoundException('Tournoi introuvable');
  }

  if (tournament.adminId !== requesterId) {
    throw new ForbiddenException(
      'Seul l\'administrateur du tournoi peut promouvoir un participant',
    );
  }

  const participant = await this.prisma.tournamentParticipant.findUnique({
    where: { tournamentId_userId: { tournamentId, userId: targetUserId } },
  });

  if (!participant) {
    throw new NotFoundException(
      'Cet utilisateur n\'est pas inscrit à ce tournoi',
    );
  }

  return this.prisma.tournamentParticipant.update({
    where: { tournamentId_userId: { tournamentId, userId: targetUserId } },
    data: { role },
  });
}

}
