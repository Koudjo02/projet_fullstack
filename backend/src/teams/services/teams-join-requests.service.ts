import {
  Injectable,
  ForbiddenException,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma.service';

@Injectable()
export class TeamsJoinRequestsService {
  constructor(private prisma: PrismaService) {}

  /**
   * Un joueur envoie une demande pour rejoindre une équipe précise.
   * Ne rejoint pas directement — reste en PENDING jusqu'à validation
   * du capitaine ou du coach.
   */
  async requestToJoin(teamId: number, userId: number) {
    const team = await this.prisma.team.findUnique({
      where: { id: teamId },
      include: { tournament: true },
    });

    if (!team) throw new NotFoundException('Équipe introuvable');

    if (team.tournament.deletedAt) {
      throw new NotFoundException('Tournoi introuvable');
    }

    // Vérifie que le joueur est bien inscrit à CE tournoi
    const participant = await this.prisma.tournamentParticipant.findUnique({
      where: {
        tournamentId_userId: { tournamentId: team.tournamentId, userId },
      },
    });

    if (!participant) {
      throw new ForbiddenException("Vous n'êtes pas inscrit à ce tournoi");
    }

    // Un joueur déjà dans une équipe (ACCEPTED quelque part) ne peut pas
    // demander à en rejoindre une autre
    if (participant.teamId) {
      throw new ConflictException('Vous appartenez déjà à une équipe dans ce tournoi');
    }

    // Vérifie qu'il n'a pas déjà une demande (peu importe son statut) pour CETTE équipe précise
    const existing = await this.prisma.teamMember.findUnique({
      where: { teamId_userId: { teamId, userId } },
    });

    if (existing) {
      throw new ConflictException(
        existing.status === 'PENDING'
          ? 'Vous avez déjà une demande en attente pour cette équipe'
          : 'Vous avez déjà une demande traitée pour cette équipe',
      );
    }

    return this.prisma.teamMember.create({
      data: { teamId, userId, role: 'PLAYER', status: 'PENDING' },
    });
  }

  /**
   * Liste les demandes en attente pour une équipe.
   * Réservé au capitaine ou au coach de cette équipe.
   */
  async listPending(teamId: number, requesterId: number) {
    await this.assertCaptainOrCoach(teamId, requesterId);

    return this.prisma.teamMember.findMany({
      where: { teamId, status: 'PENDING' },
      include: {
        user: {
          select: { id: true, username: true, name: true, avatarUrl: true },
        },
      },
    });
  }

  /**
   * Accepte une demande — le joueur devient officiellement membre de l'équipe.
   * Annule automatiquement ses éventuelles autres demandes en attente
   * dans d'autres équipes du MÊME tournoi (un joueur = une seule équipe).
   */
  async accept(teamId: number, targetUserId: number, requesterId: number) {
    await this.assertCaptainOrCoach(teamId, requesterId);

    const membership = await this.prisma.teamMember.findUnique({
      where: { teamId_userId: { teamId, userId: targetUserId } },
    });

    if (!membership || membership.status !== 'PENDING') {
      throw new NotFoundException('Aucune demande en attente pour ce joueur');
    }

    const team = await this.prisma.team.findUnique({ where: { id: teamId } });

    return this.prisma.$transaction(async (tx) => {
      // Valide la demande sur cette équipe
      const updated = await tx.teamMember.update({
        where: { teamId_userId: { teamId, userId: targetUserId } },
        data: { status: 'ACCEPTED' },
      });

      // Synchronise le participant du tournoi
      await tx.tournamentParticipant.update({
        where: {
          tournamentId_userId: { tournamentId: team!.tournamentId, userId: targetUserId },
        },
        data: { teamId, role: 'PLAYER' },
      });

      // Annule ses autres demandes PENDING dans d'autres équipes du même tournoi
      await tx.teamMember.deleteMany({
        where: {
          userId: targetUserId,
          status: 'PENDING',
          team: { tournamentId: team!.tournamentId },
          NOT: { teamId },
        },
      });

      return updated;
    });
  }

  /**
   * Rejette une demande — supprime la ligne, le joueur peut retenter
   * ailleurs ou renvoyer une demande plus tard à cette même équipe.
   */
  async reject(teamId: number, targetUserId: number, requesterId: number) {
    await this.assertCaptainOrCoach(teamId, requesterId);

    const membership = await this.prisma.teamMember.findUnique({
      where: { teamId_userId: { teamId, userId: targetUserId } },
    });

    if (!membership || membership.status !== 'PENDING') {
      throw new NotFoundException('Aucune demande en attente pour ce joueur');
    }

    return this.prisma.teamMember.delete({
      where: { teamId_userId: { teamId, userId: targetUserId } },
    });
  }

  // Vérifie que le demandeur est bien capitaine ou coach DE CETTE équipe
  private async assertCaptainOrCoach(teamId: number, requesterId: number) {
    const requesterMembership = await this.prisma.teamMember.findUnique({
      where: { teamId_userId: { teamId, userId: requesterId } },
    });

    if (
      !requesterMembership ||
      requesterMembership.status !== 'ACCEPTED' ||
      (requesterMembership.role !== 'CAPTAIN' && requesterMembership.role !== 'COACH')
    ) {
      throw new ForbiddenException(
        "Seul le capitaine ou le coach de l'équipe peut gérer les demandes",
      );
    }
  }
}
