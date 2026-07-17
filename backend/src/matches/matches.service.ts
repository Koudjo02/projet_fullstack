import {
  Injectable,
  ForbiddenException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { CreateMatchDto } from './dto/create-match.dto';

@Injectable()
export class MatchesService {
  constructor(private prisma: PrismaService) {}

  // Crée un match entre 2 équipes d'un même tournoi (admin uniquement)
  async create(requesterId: number, dto: CreateMatchDto) {
    const tournament = await this.prisma.tournament.findUnique({
      where: { id: dto.tournamentId },
    });

    if (!tournament) throw new NotFoundException('Tournoi introuvable');

    if (tournament.adminId !== requesterId) {
      throw new ForbiddenException(
        'Seul l\'administrateur du tournoi peut créer un match',
      );
    }

    if (dto.homeTeamId === dto.awayTeamId) {
      throw new BadRequestException(
        'Une équipe ne peut pas jouer contre elle-même',
      );
    }

    // Vérifie que les 2 équipes appartiennent bien à ce tournoi
    const teams = await this.prisma.team.findMany({
      where: {
        id: { in: [dto.homeTeamId, dto.awayTeamId] },
        tournamentId: dto.tournamentId,
      },
    });

    if (teams.length !== 2) {
      throw new BadRequestException(
        'Les deux équipes doivent appartenir à ce tournoi',
      );
    }

    return this.prisma.match.create({
      data: {
        tournamentId: dto.tournamentId,
        homeTeamId: dto.homeTeamId,
        awayTeamId: dto.awayTeamId,
        matchDate: dto.matchDate ? new Date(dto.matchDate) : undefined,
      },
    });
  }

  // Récupère le tableau tactique complet d'un match :
  // les 2 lineups (home + away), mais UNIQUEMENT les titulaires
  async getTacticalBoard(matchId: number) {
    const match = await this.prisma.match.findUnique({
      where: { id: matchId },
      include: {
        homeTeam: true,
        awayTeam: true,
        lineups: {
          include: {
            slots: {
              where: { isStarter: true }, // uniquement les titulaires
              include: {
                // pas de relation directe User sur LineupSlot dans le schéma,
                // donc on va chercher les infos utilisateur séparément juste après
              },
            },
          },
        },
      },
    });

    if (!match) throw new NotFoundException('Match introuvable');

    // On récupère les infos des joueurs (nom, avatar) pour chaque slot,
    // car LineupSlot ne stocke que le userId brut, pas la relation Prisma
    const allUserIds = match.lineups.flatMap((lineup) =>
      lineup.slots.map((slot) => slot.userId),
    );

    const users = await this.prisma.user.findMany({
      where: { id: { in: allUserIds } },
      select: { id: true, name: true, username: true, avatarUrl: true },
    });

    const usersById = new Map(users.map((u) => [u.id, u]));

    // On enrichit chaque slot avec les infos du joueur correspondant
    const lineupsWithPlayers = match.lineups.map((lineup) => ({
      teamId: lineup.teamId,
      slots: lineup.slots.map((slot) => ({
        ...slot,
        player: usersById.get(slot.userId),
      })),
    }));

    return {
      matchId: match.id,
      homeTeam: match.homeTeam,
      awayTeam: match.awayTeam,
      matchDate: match.matchDate,
      lineups: lineupsWithPlayers,
    };
  }

  async findOne(id: number) {
    const match = await this.prisma.match.findUnique({
      where: { id },
      include: { homeTeam: true, awayTeam: true },
    });
    if (!match) throw new NotFoundException('Match introuvable');
    return match;
  }
}
