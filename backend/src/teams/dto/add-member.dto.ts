import { IsInt } from 'class-validator';

// Le capitaine/coach précise quel joueur (déjà inscrit au tournoi) il recrute
export class AddMemberDto {
  @IsInt()
  userId: number;
}
