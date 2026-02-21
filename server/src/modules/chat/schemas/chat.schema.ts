import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { HydratedDocument } from 'mongoose';

export type ChatDocument = HydratedDocument<Chat>;

export enum MessageStatus {
  SENT = 'sent',
  DELIVERED = 'delivered',
  READ = 'read',
}

export enum ChatType {
  PRIVATE = 'private',
  GROUP = 'group',
}

@Schema({ timestamps: true })
export class Chat {
  @Prop({ required: true, index: true })
  chatRoomId: string;

  @Prop({ required: true, unique: true })
  messageId: string;

  @Prop({
    type: String,
    enum: ChatType,
    default: ChatType.PRIVATE,
    index: true,
  })
  chatType: ChatType;

  @Prop({
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  })
  sender: mongoose.Types.ObjectId;

  @Prop({
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    index: true,
  })
  receiver?: mongoose.Types.ObjectId; // Only for private messages

  @Prop({
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Group',
    index: true,
  })
  groupId?: mongoose.Types.ObjectId; // Only for group messages

  @Prop({ required: true })
  message: string;

  @Prop({ default: '' })
  attachment?: string; // URL for file/image attachments

  //enum for message status
  @Prop({ default: MessageStatus.SENT, enum: MessageStatus, index: true })
  status: MessageStatus;

  @Prop({ type: [mongoose.Schema.Types.ObjectId], default: [] })
  readBy?: mongoose.Types.ObjectId[]; // Track which group members have read the message
}

export const ChatSchema = SchemaFactory.createForClass(Chat);

// indexes for common queries
ChatSchema.index({ chatRoomId: 1, createdAt: -1 });
ChatSchema.index({ sender: 1, status: 1 });
ChatSchema.index({ groupId: 1, createdAt: -1 });
ChatSchema.index({ chatType: 1, createdAt: -1 });
