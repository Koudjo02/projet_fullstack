import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { randomBytes } from 'crypto';
import { PrismaService } from '../prisma.service';
import { CreateTournamentDto } from './dto/create-tournament.dto';
import { TournamentRole } from '../generated/prisma/enums';
import { UpdateTournamentDto } from './dto/update-tournament.dto';

@Injectable()
export class TournamentsService {
  constructor(private prisma: PrismaService) {}

  // Génère un code d'invitation unique et lisible
  private generateInviteCode(): string {
    return randomBytes(6).toString('hex');
  }

  // Génère un slug à partir du nom (ex: "Babi Foot League" -> "babi-foot-league-a1b2")
  private generateSlug(name: string): string {
    const baseSlug = name
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');
    const randomSuffix = randomBytes(2).toString('hex');
    return `${baseSlug}-${randomSuffix}`;
  }

  // Crée un tournoi, l'utilisateur connecté en devient automatiquement l'admin
  async create(adminId: number, dto: CreateTournamentDto,isSuperAdmin = false) {
    // Si le slug est déjà fourni dans la DTO on l'utilise, sinon on le génère automatiquement
    const slug = dto.slug ? dto.slug : this.generateSlug(dto.name);

    return this.prisma.tournament.create({
      data: {
        ...dto,
        slug,
        inviteCode: this.generateInviteCode(),
        adminId,
        isApproved: isSuperAdmin,
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

  // Supprime un tournoi (admin uniquement)
  async remove(id: number, requesterId: number) {
    const tournament = await this.prisma.tournament.findUnique({
      where: { id },
    });

    if (!tournament) {
      throw new NotFoundException('Tournoi introuvable');
    }

    if (tournament.adminId !== requesterId) {
      throw new ForbiddenException(
        "Seul l'administrateur du tournoi peut le supprimer",
      );
    }

    return this.prisma.tournament.delete({ where: { id } });
  }

  // Promeut un participant en CAPTAIN ou COACH (admin uniquement)
  async promoteParticipant(
    tournamentId: number,
    targetUserId: number,
    requesterId: number,
    role: TournamentRole,
  ) {
    const tournament = await this.prisma.tournament.findUnique({
      where: { id: tournamentId },
    });

    if (!tournament) {
      throw new NotFoundException('Tournoi introuvable');
    }

    if (tournament.adminId !== requesterId) {
      throw new ForbiddenException(
        "Seul l'administrateur du tournoi peut promouvoir un participant",
      );
    }

    const participant = await this.prisma.tournamentParticipant.findUnique({
      where: { tournamentId_userId: { tournamentId, userId: targetUserId } },
    });

    if (!participant) {
      throw new NotFoundException(
        "Cet utilisateur n'est pas inscrit à ce tournoi",
      );
    }

    return this.prisma.tournamentParticipant.update({
      where: { tournamentId_userId: { tournamentId, userId: targetUserId } },
      data: { role },
    });
  }
  // src/tournaments/tournaments.service.ts

// 1️⃣ Rejoindre un tournoi PUBLIC par son ID
async joinById(tournamentId: number, userId: number) {
  const tournament = await this.prisma.tournament.findUnique({
    where: { id: tournamentId },
  });

  if (!tournament) {
    throw new NotFoundException('Tournoi introuvable.');
  }

  // Vérification Senior : Le tournoi doit être public ET approuvé
  if (!tournament.isPublic) {
    throw new ForbiddenException('Ce tournoi est privé. Utilisez un code d\'invitation.');
  }
  if (!tournament.isApproved) {
    throw new NotFoundException('Ce tournoi n\'a pas encore été approuvé.');
  }

  return this.addParticipantToTournament(tournament.id, userId);
}

// 2️⃣ Rejoindre un tournoi PRIVÉ (ou public) via son CODE
async joinByCode(inviteCode: string, userId: number) {
  const tournament = await this.prisma.tournament.findUnique({
    where: { inviteCode },
  });

  if (!tournament) {
    throw new NotFoundException('Code d\'invitation invalide ou tournoi inexistant.');
  }

  return this.addParticipantToTournament(tournament.id, userId);
}

// 3️⃣ Méthode utilitaire réutilisable (DRY)
private async addParticipantToTournament(tournamentId: number, userId: number) {
  // Vérifie si l'utilisateur est déjà inscrit
  const existingParticipant = await this.prisma.tournamentParticipant.findUnique({
    where: {
      tournamentId_userId: { tournamentId, userId }, // Clé composée Prisma
    },
  });

  if (existingParticipant) {
    throw new NotFoundException('Vous êtes déjà inscrit à ce tournoi.');
  }

  return this.prisma.tournamentParticipant.create({
    data: {
      tournamentId,
      userId,
      role: 'PLAYER', // ou 'PARTICIPANT' selon tes Enums
    },
  });
}
async update(id: number, userId: number, dto: UpdateTournamentDto) {
  // 1. Vérifier si le tournoi existe
  const tournament = await this.prisma.tournament.findUnique({
    where: { id },
  });

  if (!tournament) {
    throw new NotFoundException('Tournoi introuvable');
  }

  // 2. Vérification de sécurité : Seul l'admin du tournoi peut le modifier
  if (tournament.adminId !== userId) {
    throw new ForbiddenException('Vous n\'êtes pas autorisé à modifier ce tournoi');
  }

  // 3. Ré-générer le slug si le nom change
  let slug = tournament.slug;
  if (dto.name && dto.name !== tournament.name) {
    slug = this.generateSlug(dto.name);
  }

  // 4. Mettre à jour en BDD
  return this.prisma.tournament.update({
    where: { id },
    data: {
      ...dto,
      slug,
    },
  });
}
async addParticipantByAdmin(tournamentId: number, userId: number) {
  // Vérifier si le joueur est déjà inscrit
  const existing = await this.prisma.tournamentParticipant.findUnique({
    where: { tournamentId_userId: { tournamentId, userId } },
  });

  if (existing) {
    throw new ConflictException('Cet utilisateur est déjà inscrit à ce tournoi.');
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