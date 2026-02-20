//create message dto
import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsMongoId, IsNotEmpty, IsString } from 'class-validator';
import { Type } from 'class-transformer';
import { MessageStatus } from '../schemas/chat.schema';
import mongoose from 'mongoose';

export class CreateMessageDto {
  @ApiProperty({ description: 'Chat room ID', example: 'user1_user2' })
  @IsNotEmpty({ message: 'Chat room ID is required' })
  @IsString({ message: 'Chat room ID must be a string' })
  chatRoomId: string;

  @ApiProperty({ description: 'Unique message ID', example: 'msg12345' })
  @IsNotEmpty({ message: 'Message ID is required' })
  @IsString({ message: 'Message ID must be a string' })
  messageId: string;

  @ApiProperty({
    description: 'Sender user ID',
    example: '507f1f77bcf86cd799439011',
  })
  @IsNotEmpty({ message: 'Sender user ID is required' })
  @IsMongoId({ message: 'Sender user ID must be a valid MongoDB ID' })
  @Type(() => mongoose.Types.ObjectId)
  sender: mongoose.Types.ObjectId;

  @ApiProperty({
    description: 'Receiver user ID',
    example: '507f1f77bcf86cd799439012',
  })
  @IsNotEmpty({ message: 'Receiver user ID is required' })
  @IsMongoId({ message: 'Receiver user ID must be a valid MongoDB ID' })
  @Type(() => mongoose.Types.ObjectId)
  receiver: mongoose.Types.ObjectId;

  @ApiProperty({
    description: 'Message content',
    example: 'Hello, how are you?',
  })
  @IsNotEmpty({ message: 'Message content is required' })
  @IsString({ message: 'Message content must be a string' })
  message: string;

  @ApiProperty({
    description: 'Message status',
    example: 'sent',
    enum: ['sent', 'delivered', 'read'],
  })
  @IsEnum(MessageStatus, {
    message:
      'Message status must be one of the allowed values ( sent, delivered, read )',
  })
  status: MessageStatus;
}
