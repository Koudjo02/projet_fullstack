import { Controller, Get, Patch, Param, UseGuards, ParseIntPipe } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SuperAdminGuard } from '../auth/guards/super-admin.guard';
import { TournamentsAdminService } from './services/tournaments-admin.service';

@Controller('tournaments/admin')
@UseGuards(JwtAuthGuard, SuperAdminGuard)
export class TournamentsAdminController {
  constructor(private adminService: TournamentsAdminService) {}

  @Get('pending')
  async findPendingApproval() {
    return this.adminService.findPendingApproval();
  }

  @Patch(':id/approve')
  async approve(@Param('id', ParseIntPipe) id: number) {
    return this.adminService.approve(id);
  }

  @Patch(':id/reject')
  async reject(@Param('id', ParseIntPipe) id: number) {
    return this.adminService.reject(id);
  }
}
