import {
  Injectable,
  ForbiddenException,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { UpdateMemberRoleDto } from '../dto/update-member-role.dto';

@Injectable()
export class TeamsMembersService {
  constructor(private prisma: PrismaService) {}

  /**
   * Recruter un joueur libre inscrit au tournoi dans l'équipe.
   * Seul un Capitaine ou un Coach de l'équipe peut effectuer cette action.
   */
  async addMember(teamId: number, targetUserId: number, requesterId: number) {
    // 1. Vérifier si l'équipe existe
    const team = await this.prisma.team.findUnique({ where: { id: teamId } });
    if (!team) throw new NotFoundException('Équipe introuvable');

    // 2. Contrôle d'accès : Vérifier que l'auteur de la demande est CAPTAIN ou COACH de cette équipe
    const requesterMembership = await this.prisma.teamMember.findUnique({
      where: { teamId_userId: { teamId, userId: requesterId } },
    });

    if (
      !requesterMembership ||
      (requesterMembership.role !== 'CAPTAIN' &&
        requesterMembership.role !== 'COACH')
    ) {
      throw new ForbiddenException(
        "Seul le capitaine ou le coach de l'équipe peut recruter un joueur",
      );
    }

    // 3. Vérifier que la cible est bien inscrite au MÊME tournoi
    const participant = await this.prisma.tournamentParticipant.findUnique({
      where: {
        tournamentId_userId: {
          tournamentId: team.tournamentId,
          userId: targetUserId,
        },
      },
    });

    if (!participant) {
      throw new NotFoundException("Ce joueur n'est pas inscrit à ce tournoi");
    }

    // 4. Vérifier que la cible n'a pas déjà rejoint une autre équipe
    if (participant.teamId) {
      throw new ConflictException('Ce joueur appartient déjà à une équipe');
    }

    // 5. Transaction Prisma : Ajout atomique du membre dans TeamMember ET mise à jour dans TournamentParticipant
    return this.prisma.$transaction(async (tx) => {
      // Étape A : Création de la relation d'équipe (Rôle par défaut: PLAYER)
      await tx.teamMember.create({
        data: { teamId, userId: targetUserId, role: 'PLAYER' },
      });

      // Étape B : Synchronisation du teamId et du rôle dans la table des participants du tournoi
      await tx.tournamentParticipant.update({
        where: {
          tournamentId_userId: {
            tournamentId: team.tournamentId,
            userId: targetUserId,
          },
        },
        data: { teamId, role: 'PLAYER' },
      });

      // Étape C : Retourner l'équipe mise à jour avec la liste de ses membres et leurs profils
      return tx.team.findUnique({
        where: { id: teamId },
        include: { members: { include: { user: true } } },
      });
    });
  }

  /**
   * Modifier le rôle d'un membre de l'équipe (ex: Promouvoir Joueur -> Capitaine / Coach).
   * Applique les quotas de sécurité (Max 3 Capitaines, Max 1 Coach) et empêche
   * de rétrograder le dernier capitaine restant.
   */
  async updateMemberRole(
    teamId: number,
    targetUserId: number,
    requesterId: number,
    dto: UpdateMemberRoleDto,
  ) {
    // 1. Charger l'équipe avec l'ensemble de ses membres
    const team = await this.prisma.team.findUnique({
      where: { id: teamId },
      include: { members: true },
    });

    if (!team) throw new NotFoundException('Équipe introuvable.');

    // 2. Contrôle de sécurité : L'auteur de la requête doit être Capitaine ou Coach
    const requesterMembership = team.members.find((m) => m.userId === requesterId);
    if (
      !requesterMembership ||
      (requesterMembership.role !== 'CAPTAIN' &&
        requesterMembership.role !== 'COACH')
    ) {
      throw new ForbiddenException(
        "Seul un capitaine ou un coach de l'équipe peut modifier les rôles.",
      );
    }

    // 3. Vérifier que la cible est bien membre de CETTE équipe
    const targetMember = team.members.find((m) => m.userId === targetUserId);
    if (!targetMember) {
      throw new NotFoundException(
        "L'utilisateur n'est pas membre de cette équipe.",
      );
    }

    // 4. Si le rôle demandé est identique au rôle actuel, inutile de faire une requête en BDD
    if (targetMember.role === dto.role) {
      return targetMember;
    }

    // 5. Empêche de rétrograder le DERNIER capitaine de l'équipe — sans ça,
    // une équipe pourrait se retrouver sans personne habilité à la gérer
    // (recrutement, composition, modification des infos...)
    if (targetMember.role === 'CAPTAIN' && dto.role !== 'CAPTAIN') {
      const captainCount = team.members.filter((m) => m.role === 'CAPTAIN').length;
      if (captainCount <= 1) {
        throw new BadRequestException(
          "Impossible de rétrograder le dernier capitaine de l'équipe",
        );
      }
    }

    // 6. 🔒 CONTRÔLE DES QUOTAS DE RÔLES PAR ÉQUIPE
    if (dto.role === 'CAPTAIN') {
      const captainCount = team.members.filter((m) => m.role === 'CAPTAIN').length;
      if (captainCount >= 3) {
        throw new BadRequestException(
          "L'équipe a déjà atteint la limite de 3 capitaines.",
        );
      }
    }

    if (dto.role === 'COACH') {
      const coachCount = team.members.filter((m) => m.role === 'COACH').length;
      if (coachCount >= 1) {
        throw new BadRequestException(
          "L'équipe a déjà atteint la limite de 1 coach.",
        );
      }
    }

    // 7. Transaction Prisma : Mise à jour du rôle dans TeamMember ET TournamentParticipant
    return this.prisma.$transaction(async (tx) => {
      // Étape A : Mise à jour du rôle dans la table membre de l'équipe
      const updatedMember = await tx.teamMember.update({
        where: {
          teamId_userId: { teamId, userId: targetUserId },
        },
        data: { role: dto.role },
      });

      // Étape B : Synchronisation du rôle dans la table participant du tournoi
      await tx.tournamentParticipant.update({
        where: {
          tournamentId_userId: {
            tournamentId: team.tournamentId,
            userId: targetUserId,
          },
        },
        data: { role: dto.role },
      });

      return updatedMember;
    });
  }
}
