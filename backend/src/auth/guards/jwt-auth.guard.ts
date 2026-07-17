import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

// Guard réutilisable : à mettre sur toute route qui doit être protégée
// (nécessite un JWT valide dans le header Authorization)
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}
