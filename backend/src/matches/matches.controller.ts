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
import { MatchesService } from './matches.service';
import { CreateMatchDto } from './dto/create-match.dto';

@Controller('matches')
@UseGuards(JwtAuthGuard)
export class MatchesController {
  constructor(private matchesService: MatchesService) {}

  // POST /matches → crée un match (admin uniquement)
  @Post()
  async create(@Req() req, @Body() dto: CreateMatchDto) {
    return this.matchesService.create(req.user.userId, dto);
  }

  // GET /matches/:id → infos de base du match
  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return this.matchesService.findOne(id);
  }

  // GET /matches/:id/tactical-board → le tableau tactique complet (2 équipes, titulaires uniquement)
  @Get(':id/tactical-board')
  async getTacticalBoard(@Param('id', ParseIntPipe) id: number) {
    return this.matchesService.getTacticalBoard(id);
  }
}
