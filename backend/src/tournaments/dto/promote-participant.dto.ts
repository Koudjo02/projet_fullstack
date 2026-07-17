import { IsEnum } from 'class-validator';

enum TournamentRole {
  CAPTAIN = 'CAPTAIN',
  COACH = 'COACH',
}

// L'admin choisit explicitement le rôle à attribuer (capitaine ou coach)
export class PromoteParticipantDto {
  @IsEnum(TournamentRole)
  role: TournamentRole;
}
