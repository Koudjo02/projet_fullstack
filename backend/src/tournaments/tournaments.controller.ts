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
import { TournamentsCrudService } from './services/tournaments-crud.service';
import { TournamentsParticipationService } from './services/tournaments-participation.service';
import { CreateTournamentDto } from './dto/create-tournament.dto';
import { PromoteParticipantDto } from './dto/promote-participant.dto';
import { UpdateTournamentDto } from './dto/update-tournament.dto';
import { JoinByCodeDto } from './dto/join-by-code.dto';
import { AddParticipantDto } from './dto/add-participant.dto';

@Controller('tournaments')
@UseGuards(JwtAuthGuard)
export class TournamentsController {
  constructor(
    private crudService: TournamentsCrudService,
    private participationService: TournamentsParticipationService,
  ) {}

  @Post()
  async create(@Req() req, @Body() dto: CreateTournamentDto) {
    return this.crudService.create(req.user.userId, dto);
  }

  @Get()
  async findAll(@Req() req) {
    return this.crudService.findAllForUser(req.user.userId);
  }

  @Post(':id/join')
  async joinById(@Param('id', ParseIntPipe) tournamentId: number, @Req() req) {
    return this.participationService.joinById(tournamentId, req.user.userId);
  }

  @Post('join-by-code')
  async joinByCode(@Body() dto: JoinByCodeDto, @Req() req) {
    return this.participationService.joinByCode(dto.inviteCode, req.user.userId);
  }

@Post(':id/participants')
async addParticipant(
  @Param('id', ParseIntPipe) tournamentId: number,
  @Body() dto: AddParticipantDto,
  @Req() req,
) {
  return this.participationService.addParticipantByAdmin(
    tournamentId,
    dto.userId,
    req.user.userId,
  );
}

  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return this.crudService.findOne(id);
  }

  @Patch(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Req() req,
    @Body() dto: UpdateTournamentDto,
  ) {
    return this.crudService.update(id, req.user.userId, dto);
  }

  @Delete(':id')
  async remove(@Param('id', ParseIntPipe) id: number, @Req() req) {
    return this.crudService.remove(id, req.user.userId);
  }

  @Patch(':id/participants/:userId/promote')
  async promoteParticipant(
    @Param('id', ParseIntPipe) tournamentId: number,
    @Param('userId', ParseIntPipe) targetUserId: number,
    @Body() dto: PromoteParticipantDto,
    @Req() req,
  ) {
    return this.participationService.promoteParticipant(
      tournamentId,
      targetUserId,
      req.user.userId,
      dto.role,
    );
  }
}