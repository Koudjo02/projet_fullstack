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
import { LineupsService } from './lineups.service';
import { UpsertLineupDto } from './dto/upsert-lineup.dto';

@Controller('matches/:matchId/lineups')
@UseGuards(JwtAuthGuard)
export class LineupsController {
  constructor(private lineupsService: LineupsService) {}

  // POST /matches/:matchId/lineups → crée/modifie la composition de son équipe
  @Post()
  async upsert(
    @Param('matchId', ParseIntPipe) matchId: number,
    @Body() dto: UpsertLineupDto,
    @Req() req,
  ) {
    return this.lineupsService.upsert(matchId, req.user.userId, dto);
  }

  // GET /matches/:matchId/lineups/:teamId → consulte la composition d'une équipe
  @Get(':teamId')
  async findOne(
    @Param('matchId', ParseIntPipe) matchId: number,
    @Param('teamId', ParseIntPipe) teamId: number,
  ) {
    return this.lineupsService.findByMatchAndTeam(matchId, teamId);
  }
}
