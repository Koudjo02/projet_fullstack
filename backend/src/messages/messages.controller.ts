import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  UseGuards,
  Req,
  ParseIntPipe,
  Delete,
  Patch,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { MessagesService } from './messages.service';
import { CreateMessageDto } from './dto/create-message.dto';
import { UpdateMessageDto } from './dto/update-message.dto';

// Toutes les routes sont imbriquées sous /teams/:teamId/messages,
// cohérent avec la logique déjà utilisée pour /teams/:id/members
@Controller('teams/:teamId/messages')
@UseGuards(JwtAuthGuard)
export class MessagesController {
  constructor(private messagesService: MessagesService) {}

  // POST /teams/:teamId/messages → envoie un message dans le chat de l'équipe
  @Post()
  async create(
    @Param('teamId', ParseIntPipe) teamId: number,
    @Body() dto: CreateMessageDto,
    @Req() req,
  ) {
    return this.messagesService.create(teamId, req.user.userId, dto);
  }

  // GET /teams/:teamId/messages → liste tous les messages de l'équipe
  @Get()
  async findAll(
    @Param('teamId', ParseIntPipe) teamId: number,
    @Req() req,
  ) {
    return this.messagesService.findAllForTeam(teamId, req.user.userId);
  }

  // PATCH /teams/:teamId/messages/:messageId → modifie mon message
@Patch(':messageId')
async update(
  @Param('messageId', ParseIntPipe) messageId: number,
  @Body() dto: UpdateMessageDto,
  @Req() req,
) {
  return this.messagesService.update(messageId, req.user.userId, dto);
}

// DELETE /teams/:teamId/messages/:messageId → supprime mon message
@Delete(':messageId')
async remove(
  @Param('messageId', ParseIntPipe) messageId: number,
  @Req() req,
) {
  return this.messagesService.remove(messageId, req.user.userId);
}
}
