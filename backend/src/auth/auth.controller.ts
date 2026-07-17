import { Controller, Get, Req, UseGuards, Res, Query } from '@nestjs/common';
import type { Response } from 'express';
import { GoogleAuthGuard } from './guards/google-auth.guard';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Get('google')
  @UseGuards(GoogleAuthGuard)
  async googleAuth(@Query('invite') invite: string) {
    // Le guard gère la redirection vers Google automatiquement
  }

  @Get('google/callback')
  @UseGuards(GoogleAuthGuard)
  async googleAuthRedirect(@Req() req, @Res() res: Response) {
    const inviteCode = req.query.state as string;
    const { jwt, tournamentId, profileCompleted } =
      await this.authService.validateOAuthUser(req.user, inviteCode);

    // On construit l'URL de redirection avec tous les paramètres utiles
    // à Angular pour décider où envoyer l'utilisateur
    const params = new URLSearchParams({
      token: jwt,
      profileCompleted: String(profileCompleted),
    });

    if (tournamentId) {
      params.append('tournamentId', String(tournamentId));
    }

    res.redirect(`http://localhost:4200/auth/callback?${params.toString()}`);
  }
}
