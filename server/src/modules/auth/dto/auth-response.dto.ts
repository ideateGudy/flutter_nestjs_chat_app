import { ApiProperty } from '@nestjs/swagger';

export class AuthResponseDto {
  @ApiProperty({
    example:
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9',
    description: 'Access token',
  })
  accessToken: string;

  @ApiProperty({
    example:
      'dGhpc2lzYXJlZnJlc2h0b2tlbg==dGhpc2lzYXJlZnJlc2h0b2tlbg==dGhpc2lzYXJlZnJlc2h0b2tlbg==',
    description: 'Refresh token',
  })
  refreshToken: string;

  @ApiProperty({
    description: 'Authenticated user information',
    example: {
      id: 'user-id-123',
      email: 'user@example.com',
      username: 'john.doe',
      firstName: 'John',
      lastName: 'Doe',
    },
  })
  user: {
    id: string;
    email: string;
    username: string;
    firstName?: string;
    lastName?: string;
  };
}
