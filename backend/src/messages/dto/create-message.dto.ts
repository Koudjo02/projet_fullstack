import { IsEnum, IsString, IsOptional } from 'class-validator';

enum MessageType {
  TEXT = 'TEXT',
  IMAGE = 'IMAGE',
  VOICE = 'VOICE',
  STICKER = 'STICKER',
}

// Pour un message TEXT, "content" contient le texte.
// Pour IMAGE/VOICE, "content" contiendra l'URL du fichier (une fois MinIO branché).
// Pour STICKER, "content" contiendra un identifiant de sticker (à définir plus tard).
export class CreateMessageDto {
  @IsOptional()
  @IsEnum(MessageType)
  type?: MessageType; // par défaut TEXT si non précisé

  @IsString()
  content: string;
}
