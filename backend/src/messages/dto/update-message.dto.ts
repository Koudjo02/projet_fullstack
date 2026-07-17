import { IsString } from 'class-validator';

// Seul le contenu peut être modifié (pas le type, pas l'auteur)
export class UpdateMessageDto {
  @IsString()
  content: string;
}
