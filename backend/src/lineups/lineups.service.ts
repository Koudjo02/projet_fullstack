import {
  Injectable,
  ForbiddenException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { UpsertLineupDto } from './dto/upsert-lineup.dto';

@Injectable()
export class LineupsService {
  constructor(private prisma: PrismaService) {}

  // Crée OU met à jour la composition d'une équipe pour un match précis.
  // Peut être appelée autant de fois que voulu avant le match (remplace
  // entièrement les slots à chaque appel, comme demandé).
  async upsert(matchId: number, requesterId: number, dto: UpsertLineupDto) {
    const match = await this.prisma.match.findUnique({
      where: { id: matchId },
    });
    if (!match) throw new NotFoundException('Match introuvable');

    // Vérifie que l'équipe concernée joue bien CE match
    if (match.homeTeamId !== dto.teamId && match.awayTeamId !== dto.teamId) {
      throw new BadRequestException(
        'Cette équipe ne participe pas à ce match',
      );
    }

    // Vérifie que celui qui soumet est capitaine OU coach DE CETTE équipe
    const membership = await this.prisma.teamMember.findUnique({
      where: { teamId_userId: { teamId: dto.teamId, userId: requesterId } },
    });

    if (
      !membership ||
      (membership.role !== 'CAPTAIN' && membership.role !== 'COACH')
    ) {
      throw new ForbiddenException(
        'Seul le capitaine ou le coach peut soumettre la composition',
      );
    }

    // Vérifie que TOUS les joueurs indiqués font bien partie de cette équipe
    const teamMemberIds = (
      await this.prisma.teamMember.findMany({
        where: { teamId: dto.teamId },
        select: { userId: true },
      })
    ).map((m) => m.userId);

    const invalidPlayers = dto.slots.filter(
      (slot) => !teamMemberIds.includes(slot.userId),
    );

    if (invalidPlayers.length > 0) {
      throw new BadRequestException(
        'Certains joueurs sélectionnés ne font pas partie de cette équipe',
      );
    }

    // Transaction : upsert de la Lineup + remplacement complet des slots
    return this.prisma.$transaction(async (tx) => {
      const lineup = await tx.lineup.upsert({
        where: { matchId_teamId: { matchId, teamId: dto.teamId } },
        update: { createdBy: requesterId },
        create: { matchId, teamId: dto.teamId, createdBy: requesterId },
      });

      // On supprime les anciens slots avant de recréer les nouveaux
      // (plus simple et fiable que de gérer un diff slot par slot)
      await tx.lineupSlot.deleteMany({ where: { lineupId: lineup.id } });

      await tx.lineupSlot.createMany({
        data: dto.slots.map((slot) => ({
          lineupId: lineup.id,
          userId: slot.userId,
          jerseyNumber: slot.jerseyNumber,
          position: slot.position,
          isStarter: slot.isStarter,
        })),
      });

      return tx.lineup.findUnique({
        where: { id: lineup.id },
        include: { slots: true },
      });
    });
  }

  // Récupère la composition d'une équipe pour un match (lecture, tous les membres de l'équipe)
  async findByMatchAndTeam(matchId: number, teamId: number) {
    const lineup = await this.prisma.lineup.findUnique({
      where: { matchId_teamId: { matchId, teamId } },
      include: { slots: true },
    });

    if (!lineup) {
      throw new NotFoundException(
        'Aucune composition n\'a encore été soumise pour ce match',
      );
    }

    return lineup;
  }
}
