import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  UseGuards,
  Req,
  ParseIntPipe,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TeamsCrudService } from './services/teams-crud.service';
import { TeamsMembersService } from './services/teams-members.service';
import { CreateTeamDto } from './dto/create-team.dto';
import { AddMemberDto } from './dto/add-member.dto';
import { UpdateMemberRoleDto } from './dto/update-member-role.dto';
import { UpdateTeamDto } from './dto/update-team.dto';
import { TeamsJoinRequestsService } from './services/teams-join-requests.service';

@Controller('teams')
@UseGuards(JwtAuthGuard)
export class TeamsController {
  constructor(
    private teamsCrudService: TeamsCrudService,
    private teamsMembersService: TeamsMembersService,
    private joinRequestsService: TeamsJoinRequestsService,
  ) {}

  @Post()
  async create(@Req() req, @Body() dto: CreateTeamDto) {
    return this.teamsCrudService.create(req.user.userId, dto);
  }

  @Patch(':id')
  async update(
    @Param('id', ParseIntPipe) teamId: number,
    @Req() req,
    @Body() dto: UpdateTeamDto,
  ) {
    return this.teamsCrudService.update(teamId, req.user.userId, dto);
  }

  @Post(':id/members')
  async addMember(
    @Param('id', ParseIntPipe) teamId: number,
    @Body() dto: AddMemberDto,
    @Req() req,
  ) {
    return this.teamsMembersService.addMember(teamId, dto.userId, req.user.userId);
  }

  @Patch(':teamId/members/:userId/role')
  async updateMemberRole(
    @Param('teamId', ParseIntPipe) teamId: number,
    @Param('userId', ParseIntPipe) targetUserId: number,
    @Req() req,
    @Body() dto: UpdateMemberRoleDto,
  ) {
    return this.teamsMembersService.updateMemberRole(
      teamId,
      targetUserId,
      req.user.userId,
      dto,
    );
  }

  @Get('tournament/:tournamentId')
  async findAllForTournament(
    @Param('tournamentId', ParseIntPipe) tournamentId: number,
  ) {
    return this.teamsCrudService.findAllForTournament(tournamentId);
  }

  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return this.teamsCrudService.findOne(id);
  }
  // POST /teams/:id/join-requests → envoie une demande pour rejoindre l'équipe
@Post(':id/join-requests')
async requestToJoin(@Param('id', ParseIntPipe) teamId: number, @Req() req) {
  return this.joinRequestsService.requestToJoin(teamId, req.user.userId);
}

// GET /teams/:id/join-requests → liste les demandes en attente (capitaine/coach)
@Get(':id/join-requests')
async listPending(@Param('id', ParseIntPipe) teamId: number, @Req() req) {
  return this.joinRequestsService.listPending(teamId, req.user.userId);
}

// PATCH /teams/:id/join-requests/:userId/accept
@Patch(':id/join-requests/:userId/accept')
async acceptJoinRequest(
  @Param('id', ParseIntPipe) teamId: number,
  @Param('userId', ParseIntPipe) targetUserId: number,
  @Req() req,
) {
  return this.joinRequestsService.accept(teamId, targetUserId, req.user.userId);
}

// PATCH /teams/:id/join-requests/:userId/reject
@Patch(':id/join-requests/:userId/reject')
async rejectJoinRequest(
  @Param('id', ParseIntPipe) teamId: number,
  @Param('userId', ParseIntPipe) targetUserId: number,
  @Req() req,
) {
  return this.joinRequestsService.reject(teamId, targetUserId, req.user.userId);
}
}
