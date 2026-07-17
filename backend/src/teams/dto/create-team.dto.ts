import { IsString, IsOptional, MinLength, IsInt } from 'class-validator';

// L'utilisateur qui crée l'équipe doit préciser le tournoi concerné,
// et donner un nom (+ logo optionnel) à son équipe
export class CreateTeamDto {
  @IsInt()
  tournamentId: number;

  @IsString()
  @MinLength(2)
  name: string;

  @IsOptional()
  @IsString()
  logoUrl?: string;
}
