import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  UseGuards,
  Req,
  ParseIntPipe,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TournamentsService } from './tournaments.service';
import { CreateTournamentDto } from './dto/create-tournament.dto';
import { PromoteParticipantDto } from './dto/promote-participant.dto';

@Controller('tournaments')
@UseGuards(JwtAuthGuard) // toutes les routes nécessitent d'être connecté
export class TournamentsController {
  constructor(private tournamentsService: TournamentsService) {}

  // POST /tournaments → crée un tournoi (l'utilisateur connecté devient admin)
  @Post()
  async create(@Req() req, @Body() dto: CreateTournamentDto) {
    return this.tournamentsService.create(req.user.userId, dto);
  }

  // GET /tournaments → liste mes tournois (admin ou participant)
  @Get()
  async findAll(@Req() req) {
    return this.tournamentsService.findAllForUser(req.user.userId);
  }

  // GET /tournaments/:id → détail d'un tournoi précis
  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return this.tournamentsService.findOne(id);
  }

  // DELETE /tournaments/:id → supprime le tournoi (admin uniquement)
  @Delete(':id')
  async remove(@Param('id', ParseIntPipe) id: number, @Req() req) {
    return this.tournamentsService.remove(id, req.user.userId);
  }

  // PATCH /tournaments/:id/participants/:userId/promote
  // → désigne un participant comme capitaine (admin uniquement)
// Remplace l'ancienne route "promote" par celle-ci
@Patch(':id/participants/:userId/promote')
async promoteParticipant(
  @Param('id', ParseIntPipe) tournamentId: number,
  @Param('userId', ParseIntPipe) targetUserId: number,
  @Body() dto: PromoteParticipantDto,
  @Req() req,
) {
  return this.tournamentsService.promoteParticipant(
    tournamentId,
    targetUserId,
    req.user.userId,
    dto.role,
  );
}

}
