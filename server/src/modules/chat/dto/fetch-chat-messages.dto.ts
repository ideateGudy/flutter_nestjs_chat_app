import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsMongoId, IsNotEmpty, IsOptional, Min } from 'class-validator';
import { Type } from 'class-transformer';
import mongoose from 'mongoose';

export class FetchChatMessagesDto {
  @ApiProperty({
    description: 'Current user ID',
    example: '507f1f77bcf86cd799439011',
  })
  @IsNotEmpty({ message: 'Current user ID is required' })
  @IsMongoId({ message: 'Current user ID must be a valid MongoDB ID' })
  @Type(() => mongoose.Types.ObjectId)
  currentUserId: mongoose.Types.ObjectId;

  @ApiProperty({
    description: 'Sender user ID',
    example: '507f1f77bcf86cd799439011',
  })
  @IsNotEmpty({ message: 'Sender user ID is required' })
  @IsMongoId({ message: 'Sender user ID must be a valid MongoDB ID' })
  @Type(() => mongoose.Types.ObjectId)
  senderId: mongoose.Types.ObjectId;

  @ApiProperty({
    description: 'Receiver user ID',
    example: '507f1f77bcf86cd799439012',
  })
  @IsNotEmpty({ message: 'Receiver user ID is required' })
  @IsMongoId({ message: 'Receiver user ID must be a valid MongoDB ID' })
  @Type(() => mongoose.Types.ObjectId)
  receiverId: mongoose.Types.ObjectId;

  @ApiProperty({ description: 'Page number for pagination', example: 1 })
  @IsOptional()
  @IsInt({ message: 'Page number must be an integer' })
  @Min(1, { message: 'Page number must be at least 1' })
  @Type(() => Number)
  page?: number;

  @ApiProperty({ description: 'Number of messages per page', example: 20 })
  @IsOptional()
  @IsInt({ message: 'Limit must be an integer' })
  @Min(1, { message: 'Limit must be at least 1' })
  @Type(() => Number)
  limit?: number;
}
