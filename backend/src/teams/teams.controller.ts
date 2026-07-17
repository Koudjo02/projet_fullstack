import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  UseGuards,
  Req,
  ParseIntPipe,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TeamsService } from './teams.service';
import { CreateTeamDto } from './dto/create-team.dto';
import { AddMemberDto } from './dto/add-member.dto';

@Controller('teams')
@UseGuards(JwtAuthGuard)
export class TeamsController {
  constructor(private teamsService: TeamsService) {}

  // POST /teams → crée une équipe (capitaine ou coach uniquement)
  @Post()
  async create(@Req() req, @Body() dto: CreateTeamDto) {
    return this.teamsService.create(req.user.userId, dto);
  }

  // POST /teams/:id/members → recrute un joueur dans l'équipe
  @Post(':id/members')
  async addMember(
    @Param('id', ParseIntPipe) teamId: number,
    @Body() dto: AddMemberDto,
    @Req() req,
  ) {
    return this.teamsService.addMember(teamId, dto.userId, req.user.userId);
  }

  // GET /teams/:id → détail d'une équipe
  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return this.teamsService.findOne(id);
  }

  // GET /teams/tournament/:tournamentId → liste des équipes d'un tournoi
  @Get('tournament/:tournamentId')
  async findAllForTournament(
    @Param('tournamentId', ParseIntPipe) tournamentId: number,
  ) {
    return this.teamsService.findAllForTournament(tournamentId);
  }
}
