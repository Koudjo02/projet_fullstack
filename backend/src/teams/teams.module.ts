import { Module } from '@nestjs/common';
import { TeamsController } from './teams.controller';
import { TeamsCrudService } from './services/teams-crud.service';
import { TeamsMembersService } from './services/teams-members.service';
import { PrismaService } from '../prisma.service';
import { TeamsJoinRequestsService } from './services/teams-join-requests.service';

@Module({
  controllers: [TeamsController],
  providers: [TeamsCrudService, TeamsMembersService, TeamsJoinRequestsService, PrismaService],
  exports: [TeamsCrudService, TeamsMembersService],
})
export class TeamsModule {}
