import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  UseGuards,
  Req,
  ParseIntPipe,
  Patch,
  Delete,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ConversationsService } from './conversations.service';
import { SendDirectMessageDto } from './dto/send-message.dto';
import { UpdateMessageDto } from './dto/update-message.dto';

@Controller('conversations')
@UseGuards(JwtAuthGuard)
export class ConversationsController {
  constructor(private conversationsService: ConversationsService) {}

  // GET /conversations → liste toutes mes conversations privées
  @Get()
  async getMyConversations(@Req() req) {
    return this.conversationsService.getMyConversations(req.user.userId);
  }

  // POST /conversations/with/:userId → récupère ou crée une conversation avec cet utilisateur
  // (appelé par exemple quand on clique sur "Envoyer un message" depuis un profil)
  @Post('with/:userId')
  async getOrCreate(
    @Param('userId', ParseIntPipe) targetUserId: number,
    @Req() req,
  ) {
    return this.conversationsService.getOrCreateConversation(
      req.user.userId,
      targetUserId,
    );
  }

  // GET /conversations/:id/messages → historique des messages
  @Get(':id/messages')
  async getMessages(
    @Param('id', ParseIntPipe) conversationId: number,
    @Req() req,
  ) {
    return this.conversationsService.getMessages(conversationId, req.user.userId);
  }

  // POST /conversations/:id/messages → envoie un message privé
  @Post(':id/messages')
  async sendMessage(
    @Param('id', ParseIntPipe) conversationId: number,
    @Body() dto: SendDirectMessageDto,
    @Req() req,
  ) {
    return this.conversationsService.sendMessage(
      conversationId,
      req.user.userId,
      dto,
    );
  }
// PATCH /conversations/:id/messages/:messageId → modifie mon message privé
@Patch(':id/messages/:messageId')
async updateMessage(
  @Param('messageId', ParseIntPipe) messageId: number,
  @Body() dto: UpdateMessageDto,
  @Req() req,
) {
  return this.conversationsService.updateMessage(
    messageId,
    req.user.userId,
    dto,
  );
}

// DELETE /conversations/:id/messages/:messageId → supprime mon message privé
@Delete(':id/messages/:messageId')
async removeMessage(
  @Param('messageId', ParseIntPipe) messageId: number,
  @Req() req,
) {
  return this.conversationsService.removeMessage(messageId, req.user.userId);
}

}
