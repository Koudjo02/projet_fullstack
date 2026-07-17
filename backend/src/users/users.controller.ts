import { Controller, Get, Patch, Param, Body, UseGuards, Req, ParseIntPipe } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UsersService } from './users.service';
import { CompleteProfileDto } from './dto/complete-profile.dto';

@Controller('users')
@UseGuards(JwtAuthGuard) // protège TOUTES les routes de ce contrôleur
export class UsersController {
  constructor(private usersService: UsersService) {}

  // GET /users/me → récupère mon propre profil (infos complètes)
  @Get('me')
  async getMe(@Req() req) {
    return this.usersService.getMyProfile(req.user.userId);
  }

  // PATCH /users/me → complète/modifie mon profil
  @Patch('me')
  async updateMe(@Req() req, @Body() dto: CompleteProfileDto) {
    return this.usersService.completeProfile(req.user.userId, dto);
  }

  // GET /users/:id → consulte le profil PUBLIC d'un autre utilisateur
  @Get(':id')
  async getUserById(@Param('id', ParseIntPipe) id: number) {
    return this.usersService.getPublicProfile(id);
  }
}
