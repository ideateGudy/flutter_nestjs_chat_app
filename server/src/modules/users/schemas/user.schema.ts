import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import * as bcrypt from 'bcrypt';

export type UserDocument = HydratedDocument<User> & {
  comparePassword(attempt: string): Promise<boolean>;
};

@Schema({ timestamps: true })
export class User {
  @Prop({ required: true, unique: true })
  username: string;

  @Prop({ required: true })
  password: string;

  @Prop({ required: true, unique: true })
  email: string;

  @Prop({ default: '' })
  firstName?: string;

  @Prop({ default: '' })
  lastName?: string;

  @Prop({ default: '' })
  avatar?: string; // URL of profile picture

  @Prop({ default: Date.now })
  lastSeen?: Date;

  @Prop({ default: false })
  isOnline?: boolean;

  @Prop()
  refreshToken?: string;
}

export const UserSchema = SchemaFactory.createForClass(User);

// method to check password
UserSchema.method(
  'comparePassword',
  async function (this: UserDocument, attempt: string): Promise<boolean> {
    return bcrypt.compare(attempt, this.password);
  },
);

// indexes for common queries
UserSchema.index({ isOnline: 1 });
UserSchema.index({ lastSeen: -1 });
UserSchema.index({ createdAt: -1 });
// Compound index for finding online users sorted by last seen
UserSchema.index({ isOnline: 1, lastSeen: -1 });

// Pre-save hook to hash password
UserSchema.pre<UserDocument>('save', async function () {
  if (!this.isModified('password')) return;

  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
});
