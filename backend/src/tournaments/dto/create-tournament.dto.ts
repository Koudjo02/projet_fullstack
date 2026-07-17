import { IsString, MinLength } from 'class-validator';

// Seul le nom est demandé à la création,
// l'inviteCode et l'adminId sont gérés automatiquement par le backend
export class CreateTournamentDto {
  @IsString()
  @MinLength(3)
  name: string;
}
