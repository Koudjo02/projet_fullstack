import { IsEnum, Matches, IsOptional, IsString, IsNotEmpty } from 'class-validator';

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

enum PreferredFoot {
  DROIT = 'DROIT',
  GAUCHE = 'GAUCHE',
  DEUX_PIEDS = 'DEUX_PIEDS',
}

export class CompleteProfileDto {
  @IsOptional()
  @IsString({ message: 'Le pseudo doit être une chaîne de caractères' })
  username?: string;

  @IsOptional()
  @IsEnum(Gender, { message: 'Le genre doit être HOMME ou FEMME' })
  gender?: Gender;

@IsOptional()
@IsString()
@Matches(/^\+?[0-9]{10,15}$/, {
  message: 'Le numéro de téléphone doit contenir uniquement des chiffres (10 à 15)'
})
  phoneNumber?: string;

  @IsOptional()
  @IsString({ message: 'La biographie doit être une chaîne de caractères' })
  bio?: string;

  @IsOptional()
  @IsString({ message: "Une photo uniquement" })
  avatarUrl?: string;

  @IsOptional()
  @IsString({ message: 'La ville doit être une chaîne de caractères' })
  city?: string;

  @IsOptional()
  @IsString({ message: 'Le quartier doit être une chaîne de caractères' })
  district?: string;

  @IsOptional()
  @IsEnum(FavoritePosition, {
    message: 'Le poste préféré doit être GARDIEN, DEFENSEUR, MILIEU ou ATTAQUANT',
  })
  favoritePosition?: FavoritePosition;

  @IsOptional()
  @IsEnum(PreferredFoot, {
    message: 'Le pied fort doit être DROIT, GAUCHE ou DEUX_PIEDS',
  })
  preferredFoot?: PreferredFoot;
}
