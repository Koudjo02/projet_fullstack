import { IsEnum, IsNotEmpty } from 'class-validator';

export enum TeamMemberRole {
  CAPTAIN = 'CAPTAIN',
  COACH = 'COACH',
  PLAYER = 'PLAYER',
}

export class UpdateMemberRoleDto {
  @IsEnum(TeamMemberRole)
  @IsNotEmpty()
  role: TeamMemberRole;
}
