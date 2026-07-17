import { IsEnum, IsOptional, IsString } from 'class-validator';

// Enum recopié de Prisma pour la validation des données entrantes
enum Gender {
  HOMME = 'HOMME',
  FEMME = 'FEMME',
}

enum FavoritePosition {
  GARDIEN = 'GARDIEN',
  DEFENSEUR = 'DEFENSEUR',
  MILIEU = 'MILIEU',
  ATTAQUANT = 'ATTAQUANT',
}

// Ce DTO définit et valide les données reçues quand
// un utilisateur complète son profil après l'OAuth
export class CompleteProfileDto {
  @IsString()
  username: string;

  @IsEnum(Gender)
  gender: Gender;

  @IsString()
  phoneNumber: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  district?: string;

  @IsOptional()
  @IsEnum(FavoritePosition)
  favoritePosition?: FavoritePosition;
}
