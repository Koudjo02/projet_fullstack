import { Module } from '@nestjs/common';
import { LineupsController } from './lineups.controller';
import { LineupsService } from './lineups.service';
import { PrismaService } from '../prisma.service';

@Module({
  controllers: [LineupsController],
  providers: [LineupsService, PrismaService],
})
export class LineupsModule {}
