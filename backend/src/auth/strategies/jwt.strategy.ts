import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

// Cette stratégie sait comment lire et vérifier un JWT envoyé
// dans le header "Authorization: Bearer <token>"
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor() {
    super({
      // Dit à Passport où trouver le token dans la requête
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      // Si true, on ignore les tokens expirés (dangereux, donc false)
      ignoreExpiration: false,
      // Le même secret utilisé pour SIGNER le token doit servir à le VÉRIFIER
      secretOrKey: process.env.JWT_SECRET as string,
    });
  }

  // Appelée automatiquement si le token est valide.
  // Le contenu retourné ici devient "req.user" dans tes contrôleurs.
  async validate(payload: { sub: number; email: string }) {
    return { userId: payload.sub, email: payload.email };
  }
}
