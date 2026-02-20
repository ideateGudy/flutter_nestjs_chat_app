// Refresh Token Strategy

import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, ExtractJwt, StrategyOptionsWithRequest } from 'passport-jwt';
import { Request } from 'express';
import { Injectable, Logger } from '@nestjs/common';
import { UnauthorizedException } from 'src/common/exceptions/http-exceptions';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from '../../../modules/users/schemas/user.schema';

@Injectable()
export class RefreshTokenStrategy extends PassportStrategy(
  Strategy,
  'refresh-token',
) {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    private configService: ConfigService,
  ) {
    const secretOrKey =
      configService.get<string>('JWT_REFRESH_SECRET') || 'fallback-secret';

    const options: StrategyOptionsWithRequest = {
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey,
      passReqToCallback: true,
    };

    super(options);
  }

  //Validate refresh token
  async validate(req: Request, payload: { sub: string; email: string }) {
    Logger.log('RefreshTokenStrategy.validate called');
    Logger.log('Payload', { sub: payload.sub, email: payload.email });

    const authHeader = req.headers.authorization;
    if (!authHeader) {
      Logger.log('No Authorization header found');
      throw new UnauthorizedException('Refresh token not provided');
    }

    const refreshToken = authHeader.split(' ')[1];

    if (!refreshToken) {
      Logger.log('No refresh token found in Authorization header');
      throw new UnauthorizedException('Refresh token missing after extraction');
    }

    const user = await this.userModel
      .findById(payload.sub)
      .select('refreshToken email');

    if (!user || !user.refreshToken) {
      Logger.log('User not found or no refresh token stored');
      throw new UnauthorizedException(
        'User not found or no refresh token stored',
      );
    }

    if (refreshToken !== user.refreshToken) {
      Logger.log('Refresh token mismatch');
      throw new UnauthorizedException('Refresh token mismatch');
    }
    return { id: user._id.toString(), email: user.email, sub: payload.sub };
  }
}
