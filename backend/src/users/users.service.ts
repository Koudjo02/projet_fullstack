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
    // On vérifie que le pseudo n'est pas déjà pris par quelqu'un d'autre
    const existingUsername = await this.prisma.user.findUnique({
      where: { username: dto.username },
    });
    if (existingUsername && existingUsername.id !== userId) {
      throw new ConflictException('Ce pseudo est déjà utilisé');
    }

    // Idem pour le numéro de téléphone (doit rester unique)
    const existingPhone = await this.prisma.user.findUnique({
      where: { phoneNumber: dto.phoneNumber },
    });
    if (existingPhone && existingPhone.id !== userId) {
      throw new ConflictException('Ce numéro est déjà associé à un compte');
    }

    return this.prisma.user.update({
      where: { id: userId },
      data: {
        ...dto,
        profileCompleted: true, // on marque le profil comme complété
      },
    });
  }
}
