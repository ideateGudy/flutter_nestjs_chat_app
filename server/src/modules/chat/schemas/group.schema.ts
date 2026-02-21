import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { HydratedDocument } from 'mongoose';

export type GroupDocument = HydratedDocument<Group>;

@Schema({ timestamps: true })
export class Group {
  @Prop({ required: true, unique: true })
  groupName: string;

  @Prop({ default: '' })
  groupDescription?: string;

  @Prop({ default: '' })
  groupAvatar?: string; // URL of group image

  @Prop({
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  })
  createdBy: mongoose.Types.ObjectId;

  @Prop({
    type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    default: [],
    index: true,
  })
  members: mongoose.Types.ObjectId[];

  @Prop({
    type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    default: [],
  })
  admins: mongoose.Types.ObjectId[];

  @Prop({ default: true })
  isActive?: boolean;
}

export const GroupSchema = SchemaFactory.createForClass(Group);

// indexes for common queries
GroupSchema.index({ members: 1, createdAt: -1 });
GroupSchema.index({ isActive: 1 });
