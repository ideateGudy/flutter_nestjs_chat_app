import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export class RegisterDto {
  @ApiProperty({
    example: 'john.doe',
    description: 'Unique username for the user',
  })
  @IsString({ message: 'Username must be a string' })
  @IsNotEmpty({ message: 'Username is required' })
  @MaxLength(30, { message: 'Username can be at most 30 characters long' })
  username: string;
  @ApiProperty({
    example: 'john.doe@example.com',
    description: 'User email address',
  })
  @IsEmail({}, { message: 'Please provide a valid email address' })
  @IsNotEmpty({ message: 'Email is required' })
  email: string;

  @ApiProperty({
    example: 'StrongPassword123!',
    description: 'User password',
  })
  @IsString({ message: 'Password must be a string' })
  @IsNotEmpty({ message: 'Password is required' })
  @MinLength(6, { message: 'Password must be at least 6 characters long' })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/, {
    message:
      'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character',
  })
  password: string;

  @IsOptional()
  @ApiProperty({
    example: 'John',
    description: 'User first name',
    required: false,
  })
  @IsString({ message: 'First name must be a string' })
  @MaxLength(50, { message: 'First name can be at most 50 characters long' })
  firstName?: string;

  @IsOptional()
  @ApiProperty({
    example: 'Doe',
    description: 'User last name',
    required: false,
  })
  @IsString({ message: 'Last name must be a string' })
  @MaxLength(50, { message: 'Last name can be at most 50 characters long' })
  lastName?: string;
}
