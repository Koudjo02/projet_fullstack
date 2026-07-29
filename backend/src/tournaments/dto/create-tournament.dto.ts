import { IsString, IsOptional, IsNumber, IsEnum, IsDateString, MinLength } from 'class-validator';

enum SportType {
  FOOTBALL = 'FOOTBALL',
  BASKETBALL = 'BASKETBALL',
  TENNIS = 'TENNIS',
  HANDBALL = 'HANDBALL',
  VOLLEYBALL = 'VOLLEYBALL',
}

enum TournamentFormat {
  KNOCKOUT = 'KNOCKOUT',
  HYBRID = 'HYBRID',
}

export class CreateTournamentDto {
  @IsString()
  @MinLength(3, { message: 'Le nom doit contenir au moins 3 caractères' })
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  @IsString()
  slug?: string;

  @IsOptional()
  @IsString()
  logoUrl?: string;

  @IsOptional()
  @IsString()
  bannerUrl?: string;

  @IsOptional()
  @IsEnum(SportType, { message: 'Sport invalide' })
  sport?: SportType;

  @IsOptional()
  @IsEnum(TournamentFormat, { message: 'Format invalide' })
  format?: TournamentFormat;

  @IsOptional()
  @IsNumber()
  maxTeams?: number;

  @IsOptional()
  @IsNumber()
  price?: number;

  @IsOptional()
  @IsString()
  reward?: string;

  @IsOptional()
  @IsDateString()
  registrationDeadline?: string;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  isPublic?: boolean;
}
