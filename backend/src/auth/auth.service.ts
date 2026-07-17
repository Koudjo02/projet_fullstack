import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma.service';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async validateOAuthUser(
    googleUser: { email: string; firstName: string; lastName: string },
    inviteCode?: string,
  ) {
    let user = await this.prisma.user.findUnique({
      where: { email: googleUser.email },
    });

    // Si l'utilisateur n'existe pas encore, on le crée
    // Il aura automatiquement profileCompleted = false (valeur par défaut du schéma)
    if (!user) {
      user = await this.prisma.user.create({
        data: {
          email: googleUser.email,
          name: `${googleUser.firstName} ${googleUser.lastName}`,
        },
      });
    }

    let tournamentId: number | undefined;

    if (inviteCode) {
      const tournament = await this.prisma.tournament.findUnique({
        where: { inviteCode },
      });

      if (tournament) {
        tournamentId = tournament.id;

        await this.prisma.tournamentParticipant.upsert({
          where: {
            tournamentId_userId: {
              tournamentId: tournament.id,
              userId: user.id,
            },
          },
          update: {},
          create: {
            tournamentId: tournament.id,
            userId: user.id,
          },
        });
      }
    }

    const payload = { sub: user.id, email: user.email };
    const jwt = this.jwtService.sign(payload);

    // On renvoie aussi profileCompleted, pour que le contrôleur
    // sache vers quelle page rediriger l'utilisateur
    return { jwt, tournamentId, profileCompleted: user.profileCompleted };
  }
}
