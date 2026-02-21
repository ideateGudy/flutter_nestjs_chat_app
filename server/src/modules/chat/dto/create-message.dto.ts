//create message dto
import { ApiProperty } from '@nestjs/swagger';
import {
  IsEnum,
  IsMongoId,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ChatType, MessageStatus } from '../schemas/chat.schema';
import mongoose from 'mongoose';

export class CreateMessageDto {
  @ApiProperty({ description: 'Chat room ID', example: 'user1_user2' })
  @IsNotEmpty({ message: 'Chat room ID is required' })
  @IsString({ message: 'Chat room ID must be a string' })
  chatRoomId: string;

  @ApiProperty({
    description: 'Unique message ID (auto-generated if not provided)',
    example: 'msg12345',
    required: false,
  })
  @IsOptional()
  @IsString({ message: 'Message ID must be a string' })
  messageId?: string;

  @ApiProperty({
    description: 'Chat type (private or group)',
    example: 'private',
    enum: ['private', 'group'],
  })
  @IsEnum(ChatType)
  chatType: ChatType;

  @ApiProperty({
    description: 'Sender user ID (automatically set from JWT token)',
    example: '507f1f77bcf86cd799439011',
    required: false,
  })
  @IsOptional()
  @IsMongoId({ message: 'Sender user ID must be a valid MongoDB ID' })
  @Type(() => mongoose.Types.ObjectId)
  sender?: mongoose.Types.ObjectId;

  @ApiProperty({
    description: 'Receiver user ID (for private messages)',
    example: '507f1f77bcf86cd799439012',
    required: false,
  })
  @IsOptional()
  @IsMongoId({ message: 'Receiver user ID must be a valid MongoDB ID' })
  @Type(() => mongoose.Types.ObjectId)
  receiver?: mongoose.Types.ObjectId;

  @ApiProperty({
    description: 'Group ID (for group messages)',
    required: false,
  })
  @IsOptional()
  @IsMongoId({ message: 'Group ID must be a valid MongoDB ID' })
  @Type(() => mongoose.Types.ObjectId)
  groupId?: mongoose.Types.ObjectId;

  @ApiProperty({
    description: 'Message content',
    example: 'Hello, how are you?',
  })
  @IsNotEmpty({ message: 'Message content is required' })
  @IsString({ message: 'Message content must be a string' })
  message: string;

  @ApiProperty({
    description: 'Message attachment URL',
    required: false,
  })
  @IsOptional()
  @IsString()
  attachment?: string;

  @ApiProperty({
    description: 'Message status',
    example: 'sent',
    enum: ['sent', 'delivered', 'read'],
    required: false,
  })
  @IsOptional()
  @IsEnum(MessageStatus)
  status?: MessageStatus;
}
