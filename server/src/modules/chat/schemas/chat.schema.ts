import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { HydratedDocument } from 'mongoose';

export type ChatDocument = HydratedDocument<Chat>;

export enum MessageStatus {
  SENT = 'sent',
  DELIVERED = 'delivered',
  READ = 'read',
}

@Schema({ timestamps: true })
export class Chat {
  @Prop({ required: true, index: true })
  chatRoomId: string;

  @Prop({ required: true, unique: true })
  messageId: string;

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
    required: true,
    index: true,
  })
  receiver: mongoose.Types.ObjectId;

  @Prop({ required: true })
  message: string;

  //enum for message status
  @Prop({ default: MessageStatus.SENT, enum: MessageStatus, index: true })
  status: MessageStatus;
}

export const ChatSchema = SchemaFactory.createForClass(Chat);

// indexes for common queries
ChatSchema.index({ chatRoomId: 1, createdAt: -1 });
ChatSchema.index({ sender: 1, status: 1 });
