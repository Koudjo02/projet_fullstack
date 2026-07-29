import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma.service';

// Vérifie que l'utilisateur connecté a bien le rôle SUPER_ADMIN.
// S'utilise TOUJOURS après JwtAuthGuard (qui remplit req.user.userId),
// jamais seul.
@Injectable()
export class SuperAdminGuard implements CanActivate {
  constructor(private prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const userId = request.user?.userId;

    if (!userId) {
      throw new ForbiddenException('Utilisateur non authentifié');
    }

    // On revérifie en base à CHAQUE requête plutôt que de faire confiance
    // au JWT — le rôle peut changer après l'émission du token
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { platformRole: true },
    });

    if (!user || user.platformRole !== 'SUPER_ADMIN') {
      throw new ForbiddenException(
        'Action réservée aux administrateurs de la plateforme',
      );
    }

    return true;
  }
}
