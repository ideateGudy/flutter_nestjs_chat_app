//message response dto
import { ApiProperty } from '@nestjs/swagger';
import mongoose from 'mongoose';
import { MessageStatus } from 'src/modules/chat/schemas/chat.schema';

export class MessageResponseDto {
  @ApiProperty({ description: 'Message ID', example: 'msg12345' })
  messageId: string;

  @ApiProperty({ description: 'Chat room ID', example: 'user1_user2' })
  chatRoomId: string;

  @ApiProperty({ description: 'Sender user ID', example: 'user1' })
  sender: mongoose.Types.ObjectId;

  @ApiProperty({ description: 'Receiver user ID', example: 'user2' })
  receiver: mongoose.Types.ObjectId;

  @ApiProperty({
    description: 'Message content',
    example: 'Hello, how are you?',
  })
  message: string;

  @ApiProperty({ description: 'Message status', example: 'sent' })
  status: MessageStatus;
}
