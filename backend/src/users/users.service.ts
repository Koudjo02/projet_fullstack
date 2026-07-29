import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { CompleteProfileDto } from './dto/complete-profile.dto';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  // Récupère le profil complet de l'utilisateur connecté (infos privées incluses)
  async getMyProfile(userId: number) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('Utilisateur introuvable');
    return user;
  }

  // Récupère le profil PUBLIC d'un utilisateur (consultable par n'importe qui)
  async getPublicProfile(userId: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      // On sélectionne uniquement les champs publics, on exclut l'email par exemple
      select: {
        id: true,
        username: true,
        name: true,
        bio: true,
        avatarUrl: true,
        preferredFoot: true,
        favoritePosition: true,
        city: true,
        district: true,
      },
    });
    if (!user) throw new NotFoundException('Utilisateur introuvable');
    return user;
  }

  // Complète le profil après l'inscription OAuth (pseudo, genre, téléphone...)
  async completeProfile(userId: number, dto: CompleteProfileDto) {
  // Vérifie l'unicité du téléphone UNIQUEMENT s'il est fourni dans cette requête
  if (dto.phoneNumber) {
    const existingPhone = await this.prisma.user.findUnique({
      where: { phoneNumber: dto.phoneNumber },
    });
    if (existingPhone && existingPhone.id !== userId) {
      throw new ConflictException('Ce numéro est déjà associé à un compte');
    }
  }

  const currentUser = await this.prisma.user.findUnique({ where: { id: userId } });

  // profileCompleted passe à true dès que le téléphone est renseigné
  // (le username a toujours une valeur, grâce au défaut "Inconnu")
  const willHavePhone = dto.phoneNumber ?? currentUser?.phoneNumber;
  const profileCompleted = !!willHavePhone;

  return this.prisma.user.update({
    where: { id: userId },
    data: { ...dto, profileCompleted },
  });
}

async findByPhoneNumber(phoneNumber: string) {
    const user = await this.prisma.user.findUnique({
      where: { phoneNumber },
      select: {
        id: true,
        username: true,
        name: true,
        avatarUrl: true,
        favoritePosition: true,
        preferredFoot: true,
        city: true,
        district: true,
      },
    });
    if (!user) {
      throw new NotFoundException('Aucun joueur trouvé avec ce numéro de téléphone');
    }

    return user;
  }
}

