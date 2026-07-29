import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { TournamentRole } from '../../generated/prisma/enums';

@Injectable()
export class TournamentsParticipationService {
  constructor(private prisma: PrismaService) {}

  /**
   * Inscription d'un joueur à un tournoi PUBLIC via son ID
   */
  async joinById(tournamentId: number, userId: number) {
    const tournament = await this.prisma.tournament.findUnique({
      where: { id: tournamentId },
    });

    // Un tournoi supprimé (soft delete) est traité comme introuvable
    if (!tournament || tournament.deletedAt) {
      throw new NotFoundException('Tournoi introuvable.');
    }

    // Contrôle d'accès : Doit être public et approuvé
    if (!tournament.isPublic) {
      throw new ForbiddenException("Ce tournoi est privé. Utilisez un code d'invitation.");
    }
    if (!tournament.isApproved) {
      throw new BadRequestException("Ce tournoi n'a pas encore été approuvé.");
    }

    return this.addParticipantToTournament(tournament.id, userId);
  }

  /**
   * Inscription d'un joueur à un tournoi PRIVÉ via son code d'invitation
   */
  async joinByCode(inviteCode: string, userId: number) {
    const tournament = await this.prisma.tournament.findUnique({
      where: { inviteCode },
    });

    if (!tournament || tournament.deletedAt) {
      throw new NotFoundException("Code d'invitation invalide ou tournoi inexistant.");
    }

    return this.addParticipantToTournament(tournament.id, userId);
  }

  /**
   * 👑 Action d'Administration : Forcer l'ajout d'un participant dans un tournoi.
   * Réservé à l'administrateur du tournoi concerné.
   */
  async addParticipantByAdmin(
    tournamentId: number,
    targetUserId: number,
    requesterId: number,
  ) {
    // 1. Vérifier que le tournoi existe et n'est pas supprimé
    const tournament = await this.prisma.tournament.findUnique({
      where: { id: tournamentId },
    });

    if (!tournament || tournament.deletedAt) {
      throw new NotFoundException('Tournoi introuvable.');
    }

    // 2. Vérifier que celui qui fait la demande est bien l'admin de CE tournoi
    if (tournament.adminId !== requesterId) {
      throw new ForbiddenException(
        "Seul l'administrateur du tournoi peut ajouter un participant de force",
      );
    }

    // 3. Vérification de doublon
    const existing = await this.prisma.tournamentParticipant.findUnique({
      where: { tournamentId_userId: { tournamentId, userId: targetUserId } },
    });

    if (existing) {
      throw new ConflictException('Cet utilisateur est déjà inscrit à ce tournoi.');
    }

    return this.prisma.tournamentParticipant.create({
      data: {
        tournamentId,
        userId: targetUserId,
        role: 'PLAYER',
      },
    });
  }

  /**
   * Promouvoir un joueur inscrit dans le tournoi vers un rôle élevé (ex: CAPTAIN ou COACH)
   * Seul l'administrateur du tournoi peut effectuer cette action.
   */
  async promoteParticipant(
    tournamentId: number,
    targetUserId: number,
    requesterId: number,
    role: TournamentRole,
  ) {
    // 1. Vérifier si le tournoi existe et n'est pas supprimé
    const tournament = await this.prisma.tournament.findUnique({
      where: { id: tournamentId },
    });
    if (!tournament || tournament.deletedAt) {
      throw new NotFoundException('Tournoi introuvable');
    }

    // 2. Vérifier que c'est bien l'admin du tournoi qui fait la demande
    if (tournament.adminId !== requesterId) {
      throw new ForbiddenException("Seul l'administrateur du tournoi peut promouvoir un participant");
    }

    // 3. Vérifier que la cible est bien participante au tournoi
    const participant = await this.prisma.tournamentParticipant.findUnique({
      where: { tournamentId_userId: { tournamentId, userId: targetUserId } },
    });

    if (!participant) {
      throw new NotFoundException("Cet utilisateur n'est pas inscrit à ce tournoi");
    }

    // 4. Mettre à jour le rôle du participant
    return this.prisma.tournamentParticipant.update({
      where: { tournamentId_userId: { tournamentId, userId: targetUserId } },
      data: { role },
    });
  }

  /**
   * Fonction réutilisable pour inscrire un utilisateur et éviter les doublons (principe DRY)
   */
  private async addParticipantToTournament(tournamentId: number, userId: number) {
    const existingParticipant = await this.prisma.tournamentParticipant.findUnique({
      where: { tournamentId_userId: { tournamentId, userId } },
    });

    if (existingParticipant) {
      throw new ConflictException('Vous êtes déjà inscrit à ce tournoi.');
    }

    return this.prisma.tournamentParticipant.create({
      data: {
        tournamentId,
        userId,
        role: 'PLAYER',
      },
    });
  }
}
