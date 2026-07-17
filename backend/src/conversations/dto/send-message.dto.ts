import { IsEnum, IsString, IsOptional } from 'class-validator';

enum MessageType {
  TEXT = 'TEXT',
  IMAGE = 'IMAGE',
  VOICE = 'VOICE',
  STICKER = 'STICKER',
}

export class SendDirectMessageDto {
  @IsOptional()
  @IsEnum(MessageType)
  type?: MessageType;

  @IsString()
  content: string;
}
