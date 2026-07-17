import {
  Injectable,
  ForbiddenException,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { CreateTeamDto } from './dto/create-team.dto';

@Injectable()
export class TeamsService {
  constructor(private prisma: PrismaService) {}

  // Crée une équipe : seul un participant CAPTAIN ou COACH du tournoi peut le faire
  async create(userId: number, dto: CreateTeamDto) {
    const participant = await this.prisma.tournamentParticipant.findUnique({
      where: {
        tournamentId_userId: { tournamentId: dto.tournamentId, userId },
      },
    });

    if (!participant) {
      throw new ForbiddenException(
        'Vous n\'êtes pas inscrit à ce tournoi',
      );
    }

    if (participant.role !== 'CAPTAIN' && participant.role !== 'COACH') {
      throw new ForbiddenException(
        'Seul un capitaine ou un coach peut créer une équipe',
      );
    }

    if (participant.teamId) {
      throw new ConflictException(
        'Vous appartenez déjà à une équipe dans ce tournoi',
      );
    }

    // Transaction : on crée l'équipe, on ajoute le créateur comme membre
    // avec son rôle (capitaine ou coach), et on le lie à cette équipe.
    // Le "$transaction" garantit que tout se passe ensemble ou rien du tout.
    return this.prisma.$transaction(async (tx) => {
      const team = await tx.team.create({
        data: {
          name: dto.name,
          logoUrl: dto.logoUrl,
          tournamentId: dto.tournamentId,
        },
      });

      await tx.teamMember.create({
        data: {
          teamId: team.id,
          userId,
          role: participant.role, // CAPTAIN ou COACH, hérité du rôle au tournoi
        },
      });

      await tx.tournamentParticipant.update({
        where: {
          tournamentId_userId: { tournamentId: dto.tournamentId, userId },
        },
        data: { teamId: team.id },
      });

      return team;
    });
  }

  // Recrute un joueur inscrit au tournoi dans l'équipe
  async addMember(teamId: number, targetUserId: number, requesterId: number) {
    const team = await this.prisma.team.findUnique({ where: { id: teamId } });
    if (!team) throw new NotFoundException('Équipe introuvable');

    // Vérifie que celui qui recrute est bien capitaine ou coach DE CETTE équipe
    const requesterMembership = await this.prisma.teamMember.findUnique({
      where: { teamId_userId: { teamId, userId: requesterId } },
    });

    if (
      !requesterMembership ||
      (requesterMembership.role !== 'CAPTAIN' &&
        requesterMembership.role !== 'COACH')
    ) {
      throw new ForbiddenException(
        'Seul le capitaine ou le coach de l\'équipe peut recruter un joueur',
      );
    }

    // Vérifie que le joueur ciblé est bien inscrit au MÊME tournoi, et libre
    const participant = await this.prisma.tournamentParticipant.findUnique({
      where: {
        tournamentId_userId: { tournamentId: team.tournamentId, userId: targetUserId },
      },
    });

    if (!participant) {
      throw new NotFoundException(
        'Ce joueur n\'est pas inscrit à ce tournoi',
      );
    }

    if (participant.teamId) {
      throw new ConflictException(
        'Ce joueur appartient déjà à une équipe',
      );
    }

    return this.prisma.$transaction(async (tx) => {
      await tx.teamMember.create({
        data: { teamId, userId: targetUserId, role: 'PLAYER' },
      });

      await tx.tournamentParticipant.update({
        where: {
          tournamentId_userId: { tournamentId: team.tournamentId, userId: targetUserId },
        },
        data: { teamId },
      });

      return tx.team.findUnique({
        where: { id: teamId },
        include: { members: { include: { user: true } } },
      });
    });
  }

  // Détail d'une équipe avec ses membres
  async findOne(teamId: number) {
    const team = await this.prisma.team.findUnique({
      where: { id: teamId },
      include: {
        members: {
          include: {
            user: {
              select: { id: true, username: true, name: true, avatarUrl: true },
            },
          },
        },
      },
    });

    if (!team) throw new NotFoundException('Équipe introuvable');
    return team;
  }

  // Liste des équipes d'un tournoi
  async findAllForTournament(tournamentId: number) {
    return this.prisma.team.findMany({
      where: { tournamentId },
      include: { members: true },
    });
  }
}
