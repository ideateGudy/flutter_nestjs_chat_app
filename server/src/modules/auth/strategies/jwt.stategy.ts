// Jwt strategy for authentication using JWT tokens
import { Injectable } from '@nestjs/common';
import { UnauthorizedException } from 'src/common/exceptions/http-exceptions';
import { PassportStrategy } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { Strategy, ExtractJwt } from 'passport-jwt';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from '../../../modules/users/schemas/user.schema';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    private configService: ConfigService,
  ) {
    const secretOrKey = configService.get<string>('JWT_SECRET');
    if (!secretOrKey) {
      throw new Error('JWT_SECRET environment variable is not set');
    }

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey,
    });
  }

  // Validate the JWT payload and return the user
  async validate(payload: { sub: string; email: string }) {
    const user = await this.userModel.findById(payload.sub).select('-password');

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return { id: user._id.toString(), email: user.email, sub: payload.sub };
  }
}
