// src/tournaments/dto/join-by-code.dto.ts
import { IsNotEmpty, IsString } from 'class-validator';

export class JoinByCodeDto {
  @IsString()
  @IsNotEmpty()
  inviteCode: string;
}
