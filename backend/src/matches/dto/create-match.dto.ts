import { IsInt, IsOptional, IsDateString } from 'class-validator';

// L'admin crée un match en précisant le tournoi et les 2 équipes qui s'affrontent
export class CreateMatchDto {
  @IsInt()
  tournamentId: number;

  @IsInt()
  homeTeamId: number;

  @IsInt()
  awayTeamId: number;

  @IsOptional()
  @IsDateString()
  matchDate?: string;
}
