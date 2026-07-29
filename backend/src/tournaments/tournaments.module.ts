import { Module } from '@nestjs/common';
import { TournamentsController } from './tournaments.controller';
import { TournamentsPublicController } from './tournaments-public.controller';
import { TournamentsAdminController } from './tournaments-admin.controller';
import { TournamentsCrudService } from './services/tournaments-crud.service';
import { TournamentsParticipationService } from './services/tournaments-participation.service';
import { TournamentsAdminService } from './services/tournaments-admin.service';
import { PrismaService } from '../prisma.service';

@Module({
  controllers: [
    TournamentsPublicController,  // routes fixes en premier
    TournamentsAdminController,   // routes fixes en premier
    TournamentsController,        // routes avec :id en dernier
  ],
  providers: [
    TournamentsCrudService,
    TournamentsParticipationService,
    TournamentsAdminService,
    PrismaService,
  ],
})
export class TournamentsModule {}