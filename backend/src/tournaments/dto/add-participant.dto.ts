import { IsInt } from 'class-validator';

export class AddParticipantDto {
  @IsInt()
  userId: number;
}
