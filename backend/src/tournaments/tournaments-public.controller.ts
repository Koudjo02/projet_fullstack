import { Controller, Get, Param, Query } from '@nestjs/common';
import { TournamentsCrudService } from './services/tournaments-crud.service';

// Volontairement SANS @UseGuards — consultable par tous, connecté ou non,
// pour permettre le partage et la découverte publique des tournois
@Controller('tournaments/public')
export class TournamentsPublicController {
  constructor(private crudService: TournamentsCrudService) {}

  @Get()
  async findAll(
    @Query('city') city?: string,
    @Query('sport') sport?: string,
    @Query('status') status?: string,
  ) {
    return this.crudService.findPublicTournaments({ city, sport, status });
  }

  @Get(':slug')
  async findBySlug(@Param('slug') slug: string) {
    return this.crudService.findBySlug(slug);
  }
}
