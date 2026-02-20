import { Injectable } from '@nestjs/common';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from 'src/common/exceptions/http-exceptions';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { randomBytes } from 'crypto';
import { RegisterDto } from './dto/register.dto';
import { AuthResponseDto } from './dto/auth-response.dto';
import { LoginDto } from './dto/login.dto';
import { User, UserDocument } from '../users/schemas/user.schema';

@Injectable()
export class AuthService {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  // Register
  async register(registerDto: RegisterDto): Promise<AuthResponseDto> {
    const { email, password, firstName, lastName, username } = registerDto;

    const existingUser = await this.userModel.findOne({ username });

    if (existingUser) {
      throw new ConflictException('User with this username already exists');
    }

    // Password will be hashed automatically by the pre-save hook in the schema
    const user = await this.userModel.create({
      email,
      password,
      firstName: firstName || '',
      lastName: lastName || '',
      username: username || email.split('@')[0],
    });

    const userResponse = {
      id: user._id.toString(),
      email: user.email,
      username: user.username,
      firstName: user.firstName,
      lastName: user.lastName,
    };

    const tokens = await this.generateTokens(user._id.toString(), user.email);
    await this.updateRefreshToken(user._id.toString(), tokens.refreshToken);

    return {
      ...tokens,
      user: userResponse,
    };
  }

  // Generate access and refresh tokens
  private async generateTokens(
    userId: string,
    email: string,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const payload = { sub: userId, email };
    const refreshId = randomBytes(16).toString('hex');
    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, { expiresIn: '15m' }),
      this.jwtService.signAsync(
        { ...payload, refreshId },
        {
          secret:
            this.configService.get<string>('JWT_REFRESH_SECRET') ||
            this.configService.get<string>('JWT_SECRET'),
          expiresIn: '7d',
        },
      ),
    ]);
    return {
      accessToken,
      refreshToken,
    };
  }

  // Update refresh token in the database
  async updateRefreshToken(
    userId: string,
    refreshToken: string,
  ): Promise<void> {
    await this.userModel.findByIdAndUpdate(userId, { refreshToken });
  }

  // Refresh tokens
  async refreshTokens(userId: string): Promise<AuthResponseDto> {
    const user = await this.userModel
      .findById(userId)
      .select('-password -refreshToken');

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const userResponse = {
      id: user._id.toString(),
      email: user.email,
      username: user.username,
      firstName: user.firstName,
      lastName: user.lastName,
    };

    const tokens = await this.generateTokens(user._id.toString(), user.email);
    await this.updateRefreshToken(user._id.toString(), tokens.refreshToken);

    return {
      ...tokens,
      user: userResponse,
    };
  }

  // Logout
  async logout(userId: string): Promise<void> {
    await this.userModel.findByIdAndUpdate(userId, { refreshToken: null });
  }

  // Login
  async login(loginDto: LoginDto): Promise<AuthResponseDto> {
    const { email, password } = loginDto;

    const user = await this.userModel.findOne({ email });

    if (!user || !(await user.comparePassword(password))) {
      throw new BadRequestException('Invalid email or password');
    }

    const tokens = await this.generateTokens(user._id.toString(), user.email);
    await this.updateRefreshToken(user._id.toString(), tokens.refreshToken);

    return {
      ...tokens,
      user: {
        id: user._id.toString(),
        email: user.email,
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
      },
    };
  }
}
