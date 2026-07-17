import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { SendDirectMessageDto } from './dto/send-message.dto';
import { UpdateMessageDto } from './dto/update-message.dto';

@Injectable()
export class ConversationsService {
  constructor(private prisma: PrismaService) {}

  // Trouve la conversation existante entre 2 utilisateurs, ou la crée si elle n'existe pas.
  // On force un ordre (plus petit id = userA) pour que la contrainte @@unique
  // empêche toute duplication, peu importe qui initie la conversation.
  async getOrCreateConversation(userId1: number, userId2: number) {
    if (userId1 === userId2) {
      throw new ForbiddenException(
        'Vous ne pouvez pas démarrer une conversation avec vous-même',
      );
    }

    const [userAId, userBId] =
      userId1 < userId2 ? [userId1, userId2] : [userId2, userId1];

    const existing = await this.prisma.conversation.findUnique({
      where: { userAId_userBId: { userAId, userBId } },
    });

    if (existing) return existing;

    return this.prisma.conversation.create({
      data: { userAId, userBId },
    });
  }

  // Vérifie que l'utilisateur fait bien partie de cette conversation
  private async assertParticipant(conversationId: number, userId: number) {
    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
    });

    if (!conversation) throw new NotFoundException('Conversation introuvable');

    if (conversation.userAId !== userId && conversation.userBId !== userId) {
      throw new ForbiddenException(
        'Vous ne faites pas partie de cette conversation',
      );
    }

    return conversation;
  }

  // Envoie un message privé dans une conversation existante
  async sendMessage(
    conversationId: number,
    senderId: number,
    dto: SendDirectMessageDto,
  ) {
    await this.assertParticipant(conversationId, senderId);

    return this.prisma.directMessage.create({
      data: {
        conversationId,
        senderId,
        type: dto.type ?? 'TEXT',
        content: dto.content,
      },
    });
  }

  // Liste les messages d'une conversation, du plus ancien au plus récent
  async getMessages(conversationId: number, requesterId: number) {
    await this.assertParticipant(conversationId, requesterId);

    return this.prisma.directMessage.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'asc' },
      include: {
        sender: {
          select: { id: true, name: true, username: true, avatarUrl: true },
        },
      },
    });
  }

  // Liste toutes mes conversations, avec l'autre utilisateur affiché
  // (utile pour l'écran "Discussions" façon WhatsApp)
  async getMyConversations(userId: number) {
    const conversations = await this.prisma.conversation.findMany({
      where: { OR: [{ userAId: userId }, { userBId: userId }] },
      include: {
        userA: { select: { id: true, name: true, username: true, avatarUrl: true } },
        userB: { select: { id: true, name: true, username: true, avatarUrl: true } },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1, // juste le dernier message, pour l'aperçu
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // On simplifie la réponse : on ne renvoie que "l'AUTRE" utilisateur
    // (peu importe si c'était userA ou userB), plus pratique côté frontend
    return conversations.map((conv) => ({
      id: conv.id,
      otherUser: conv.userAId === userId ? conv.userB : conv.userA,
      lastMessage: conv.messages[0] ?? null,
    }));
  }

  async updateMessage(
  messageId: number,
  requesterId: number,
  dto: UpdateMessageDto,
) {
  const message = await this.prisma.directMessage.findUnique({
    where: { id: messageId },
  });

  if (!message) throw new NotFoundException('Message introuvable');

  if (message.senderId !== requesterId) {
    throw new ForbiddenException(
      'Vous ne pouvez modifier que vos propres messages',
    );
  }

  return this.prisma.directMessage.update({
    where: { id: messageId },
    data: { content: dto.content },
  });
}

async removeMessage(messageId: number, requesterId: number) {
  const message = await this.prisma.directMessage.findUnique({
    where: { id: messageId },
  });

  if (!message) throw new NotFoundException('Message introuvable');

  if (message.senderId !== requesterId) {
    throw new ForbiddenException(
      'Vous ne pouvez supprimer que vos propres messages',
    );
  }

  return this.prisma.directMessage.delete({ where: { id: messageId } });
}

}
