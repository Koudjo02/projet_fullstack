import {
  IsInt,
  IsArray,
  ValidateNested,
  IsOptional,
  IsEnum,
  IsBoolean,
} from 'class-validator';
import { Type } from 'class-transformer';

enum Position {
  GA = 'GA',
  DC = 'DC',
  LAD = 'LAD',
  LAG = 'LAG',
  MD = 'MD',
  MC = 'MC',
  MO = 'MO',
  AD = 'AD',
  AG = 'AG',
  ATT = 'ATT',
}

// Un joueur positionné dans la composition
class LineupSlotDto {
  @IsInt()
  userId: number;

  @IsOptional()
  @IsInt()
  jerseyNumber?: number;

  @IsOptional()
  @IsEnum(Position)
  position?: Position;

  @IsBoolean()
  isStarter: boolean;
}

// La composition complète envoyée par le capitaine/coach pour son équipe
export class UpsertLineupDto {
  @IsInt()
  teamId: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => LineupSlotDto)
  slots: LineupSlotDto[];
}
