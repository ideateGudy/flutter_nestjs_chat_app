import { ApiProperty } from '@nestjs/swagger';
import {
  IsMongoId,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsArray,
} from 'class-validator';
import { Type } from 'class-transformer';
import mongoose from 'mongoose';

export class CreateGroupDto {
  @ApiProperty({ description: 'Group name', example: 'Project Team' })
  @IsNotEmpty({ message: 'Group name is required' })
  @IsString()
  groupName: string;

  @ApiProperty({
    description: 'Group description',
    example: 'Group for project discussions',
    required: false,
  })
  @IsOptional()
  @IsString()
  groupDescription?: string;

  @ApiProperty({
    description: 'Group avatar URL',
    required: false,
  })
  @IsOptional()
  @IsString()
  groupAvatar?: string;

  @ApiProperty({
    description: 'Group member IDs',
    example: ['507f1f77bcf86cd799439011'],
  })
  @IsArray()
  @IsMongoId({ each: true })
  @Type(() => mongoose.Types.ObjectId)
  members: mongoose.Types.ObjectId[];
}

export class UpdateGroupDto {
  @ApiProperty({
    description: 'Group name',
    required: false,
  })
  @IsOptional()
  @IsString()
  groupName?: string;

  @ApiProperty({
    description: 'Group description',
    required: false,
  })
  @IsOptional()
  @IsString()
  groupDescription?: string;

  @ApiProperty({
    description: 'Group avatar URL',
    required: false,
  })
  @IsOptional()
  @IsString()
  groupAvatar?: string;
}

export class AddGroupMemberDto {
  @ApiProperty({
    description: 'User ID to add to the group',
  })
  @IsMongoId()
  @Type(() => mongoose.Types.ObjectId)
  userId: mongoose.Types.ObjectId;
}

export class RemoveGroupMemberDto {
  @ApiProperty({
    description: 'User ID to remove from the group',
  })
  @IsMongoId()
  @Type(() => mongoose.Types.ObjectId)
  userId: mongoose.Types.ObjectId;
}
