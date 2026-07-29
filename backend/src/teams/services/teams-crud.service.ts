import {
  Injectable,
  ForbiddenException,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { CreateTeamDto } from '../dto/create-team.dto';
import { UpdateTeamDto } from '../dto/update-team.dto';

@Injectable()
export class TeamsCrudService {
  constructor(private prisma: PrismaService) {}

  /**
   * Créer une nouvelle équipe dans un tournoi.
   * L'utilisateur qui crée l'équipe en devient automatiquement le Capitaine.
   */
  async create(userId: number, dto: CreateTeamDto) {
  // 1. Vérifier que le tournoi existe, n'est pas supprimé, et accepte encore des équipes
  const tournament = await this.prisma.tournament.findUnique({
    where: { id: dto.tournamentId },
  });

  if (!tournament || tournament.deletedAt) {
    throw new NotFoundException('Tournoi introuvable');
  }

  if (tournament.status !== 'OPEN') {
    throw new ForbiddenException(
      "Ce tournoi n'accepte plus de nouvelles équipes",
    );
  }

  // 2. Vérifier si l'utilisateur est inscrit au tournoi
  const participant = await this.prisma.tournamentParticipant.findUnique({
    where: {
      tournamentId_userId: { tournamentId: dto.tournamentId, userId },
    },
  });

  if (!participant) {
    throw new ForbiddenException("Vous n'êtes pas inscrit à ce tournoi");
  }

  // 3. Vérifier que l'utilisateur n'a pas déjà une équipe dans ce tournoi
  if (participant.teamId) {
    throw new ConflictException(
      'Vous appartenez déjà à une équipe dans ce tournoi',
    );
  }

  // 4. Transaction Prisma : Création atomique de l'équipe, du membre et mise à jour du rôle
  return this.prisma.$transaction(async (tx) => {
    // Étape A : Créer l'équipe dans la base de données
    const team = await tx.team.create({
      data: {
        name: dto.name,
        logoUrl: dto.logoUrl,
        tournamentId: dto.tournamentId,
        createdById: userId, // trace qui a créé l'équipe, cohérent avec le champ ajouté au schéma
      },
    });

    // Étape B : Inscrire l'utilisateur comme Capitaine dans l'équipe
    await tx.teamMember.create({
      data: { teamId: team.id, userId, role: 'CAPTAIN' },
    });

    // Étape C : Mettre à jour son statut de participant au tournoi
    await tx.tournamentParticipant.update({
      where: {
        tournamentId_userId: { tournamentId: dto.tournamentId, userId },
      },
      data: { teamId: team.id, role: 'CAPTAIN' },
    });

    return team;
  });
}

  /**
   * Mettre à jour les informations d'une équipe (nom, logo, etc.)
   * Accessible uniquement aux membres ayant le rôle CAPTAIN ou COACH.
   */
async update(teamId: number, userId: number, dto: UpdateTeamDto) {
  // 1. Vérifier l'existence de l'équipe
  const team = await this.prisma.team.findUnique({ where: { id: teamId } });
  if (!team) throw new NotFoundException('Équipe introuvable.');

  // 2. Contrôle de sécurité : requête directe sur la clé composée,
  // plus efficace que de charger tous les membres pour n'en filtrer qu'un
  const membership = await this.prisma.teamMember.findUnique({
    where: { teamId_userId: { teamId, userId } },
  });

  if (!membership || (membership.role !== 'CAPTAIN' && membership.role !== 'COACH')) {
    throw new ForbiddenException(
      "Seul le capitaine ou le coach de l'équipe peut modifier ses informations.",
    );
  }

  // 3. Appliquer la mise à jour
  return this.prisma.team.update({
    where: { id: teamId },
    data: { ...dto },
  });
}


  /**
   * Récupérer le détail complet d'une équipe spécifique avec la liste de ses membres
   */
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

  /**
   * Récupérer la liste de toutes les équipes inscrites à un tournoi donné
   */
  async findAllForTournament(tournamentId: number) {
    return this.prisma.team.findMany({
      where: { tournamentId },
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
  }
}