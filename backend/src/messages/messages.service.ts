import {
  Injectable,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { CreateMessageDto } from './dto/create-message.dto';
import { UpdateMessageDto } from './dto/update-message.dto';

@Injectable()
export class MessagesService {
  constructor(private prisma: PrismaService) {}

  // Envoie un message dans le chat d'une équipe.
  // Seuls les membres de l'équipe (capitaine, coach, joueur) peuvent écrire.
  async create(teamId: number, senderId: number, dto: CreateMessageDto) {
    const membership = await this.prisma.teamMember.findUnique({
      where: { teamId_userId: { teamId, userId: senderId } },
    });

    if (!membership) {
      throw new ForbiddenException(
        'Vous ne faites pas partie de cette équipe',
      );
    }

    return this.prisma.message.create({
      data: {
        teamId,
        senderId,
        type: dto.type ?? 'TEXT',
        content: dto.content,
      },
    });
  }

  // Liste les messages d'une équipe, du plus ancien au plus récent.
  // Réservé aux membres de l'équipe (pas de fuite vers l'extérieur).
  async findAllForTeam(teamId: number, requesterId: number) {
    const team = await this.prisma.team.findUnique({ where: { id: teamId } });
    if (!team) throw new NotFoundException('Équipe introuvable');

    const membership = await this.prisma.teamMember.findUnique({
      where: { teamId_userId: { teamId, userId: requesterId } },
    });

    if (!membership) {
      throw new ForbiddenException(
        'Vous ne faites pas partie de cette équipe',
      );
    }

    return this.prisma.message.findMany({
      where: { teamId },
      orderBy: { createdAt: 'asc' },
      include: {
        sender: {
          select: { id: true, name: true, username: true, avatarUrl: true },
        },
      },
    });
  }
  // Modifie un message : seul l'auteur peut le faire
async update(messageId: number, requesterId: number, dto: UpdateMessageDto) {
  const message = await this.prisma.message.findUnique({
    where: { id: messageId },
  });

  if (!message) throw new NotFoundException('Message introuvable');

  if (message.senderId !== requesterId) {
    throw new ForbiddenException(
      'Vous ne pouvez modifier que vos propres messages',
    );
  }

  return this.prisma.message.update({
    where: { id: messageId },
    data: { content: dto.content },
  });
}

// Supprime un message : seul l'auteur peut le faire
async remove(messageId: number, requesterId: number) {
  const message = await this.prisma.message.findUnique({
    where: { id: messageId },
  });

  if (!message) throw new NotFoundException('Message introuvable');

  if (message.senderId !== requesterId) {
    throw new ForbiddenException(
      'Vous ne pouvez supprimer que vos propres messages',
    );
  }

  return this.prisma.message.delete({ where: { id: messageId } });
}

}
