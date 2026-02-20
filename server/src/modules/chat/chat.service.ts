import { Injectable, Logger } from '@nestjs/common';
import { NotFoundException } from 'src/common/exceptions/http-exceptions';
import { Chat, MessageStatus } from './schemas/chat.schema';
import mongoose, { Model } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';
import { ConfigService } from '@nestjs/config';
import { CreateMessageDto } from './dto/create-message.dto';
import { MessageResponseDto } from './dto/message-response.dto';
import { FetchChatMessagesDto } from './dto/fetch-chat-messages.dto';
import { generateChatRoomId } from 'src/common/utils/chat-helper.util';
import { User } from '../users/schemas/user.schema';

export interface UserLastSeenUpdate {
  _id: mongoose.Types.ObjectId;
  lastSeen: Date;
}

@Injectable()
export class ChatService {
  constructor(
    @InjectModel(Chat.name) private readonly chatModel: Model<Chat>,
    @InjectModel(User.name) private readonly userModel: Model<User>,
    private readonly configService: ConfigService,
  ) {}

  //create message
  async createMessage(
    createMessageDto: CreateMessageDto,
  ): Promise<MessageResponseDto> {
    const { chatRoomId, messageId, sender, receiver, message, status } =
      createMessageDto;
    const messageObject = {
      chatRoomId: chatRoomId,
      messageId: messageId,
      sender: sender,
      receiver: receiver,
      message: message,
      status: status || MessageStatus.SENT,
    };
    const createdMessage = new this.chatModel(messageObject);
    const savedMessage = await createdMessage.save();
    return savedMessage.toObject() as MessageResponseDto;
  }

  //fetch chat messages
  async fetchChatMessages(
    FetchChatMessagesDto: FetchChatMessagesDto,
  ): Promise<MessageResponseDto[]> {
    const {
      currentUserId,
      senderId,
      receiverId,
      page = 1,
      limit = 20,
    } = FetchChatMessagesDto;
    const getRoomId = generateChatRoomId(senderId, receiverId);

    const query = { chatRoomId: getRoomId };

    // Mark all unread messages delivered to currentUserId as delivered
    const unDeliveredQuery = {
      chatRoomId: getRoomId,
      receiver: new mongoose.Types.ObjectId(currentUserId),
      status: MessageStatus.SENT,
    };
    const undeliveredMessages = await this.chatModel.updateMany(
      unDeliveredQuery,
      {
        $set: { status: MessageStatus.DELIVERED },
      },
    );

    if (undeliveredMessages.modifiedCount > 0) {
      Logger.log(
        `Updated ${undeliveredMessages.modifiedCount} messages to delivered status`,
      );
    }

    const messages = await this.chatModel
      .aggregate([
        { $match: query },
        { $sort: { createdAt: -1 } },
        { $skip: (page - 1) * limit },
        { $limit: limit },
        {
          $addFields: {
            isMine: {
              $eq: ['$sender', { $toObjectId: currentUserId }],
            },
          },
        },
      ])
      .exec();

    if (messages.length === 0) {
      Logger.log(
        `No messages found for chat room ${getRoomId} with currentUserId ${currentUserId.toString()}`,
      );
    }

    return messages.reverse();
    //   .map((msg) => msg.toObject() as MessageResponseDto);
  }

  //update message status
  async updateMessageStatus(
    messageId: string,
    status: MessageStatus,
  ): Promise<MessageResponseDto> {
    const updatedMessage = await this.chatModel.findOneAndUpdate(
      { messageId },
      { status },
      { new: true },
    );

    if (!updatedMessage) {
      Logger.warn(
        `Message with messageId: ${messageId} not found for status update`,
      );
      throw new NotFoundException('Message not found');
    }
    Logger.log(`Updated message status for messageId: ${messageId}`);
    return updatedMessage.toObject() as MessageResponseDto;
  }

  //get undelivered messages for a user
  async getUndeliveredMessages(
    userId: mongoose.Types.ObjectId,
    partnerId: mongoose.Types.ObjectId,
  ): Promise<MessageResponseDto[]> {
    const undeliveredMessages = await this.chatModel.find({
      receiver: userId,
      sender: partnerId,
      status: MessageStatus.SENT,
    });

    if (!undeliveredMessages || undeliveredMessages.length === 0) {
      Logger.warn(
        `No undelivered messages found for userId: ${userId.toString()} and partnerId: ${partnerId.toString()}`,
      );
      return [];
    }
    Logger.log(
      `Found ${undeliveredMessages.length} undelivered messages for userId: ${userId.toString()}`,
    );
    return undeliveredMessages;
    // .map((msg) => msg.toObject() as MessageResponseDto);
  }

  //update user last seen timestamp
  async updateUserLastSeen(
    userId: mongoose.Types.ObjectId,
    lastSeen: Date,
  ): Promise<UserLastSeenUpdate> {
    const updatedUser = await this.userModel.findOneAndUpdate(
      { _id: userId } as Record<string, any>,
      { lastSeen },
      { new: true },
    );

    if (!updatedUser) {
      Logger.warn(
        `User with userId: ${userId.toString()} not found for last seen update`,
      );
      throw new NotFoundException('User not found');
    }
    Logger.log(`Updated last seen timestamp for userId: ${userId.toString()}`);
    return updatedUser.toObject() as UserLastSeenUpdate;
  }

  //mark messages as delivered for a user
  async markMessagesAsDelivered(
    userId: mongoose.Types.ObjectId,
    partnerId: mongoose.Types.ObjectId,
  ): Promise<number> {
    const result = await this.chatModel.updateMany(
      {
        receiver: userId,
        sender: partnerId,
        status: MessageStatus.SENT,
      },
      { status: MessageStatus.DELIVERED },
    );
    return result.modifiedCount;
  }

  //mark messages as read for a user
  async markMessagesAsRead(
    userId: mongoose.Types.ObjectId,
    partnerId: mongoose.Types.ObjectId,
  ): Promise<number> {
    const result = await this.chatModel.updateMany(
      {
        receiver: userId,
        sender: partnerId,
        status: { $in: [MessageStatus.SENT, MessageStatus.DELIVERED] },
      },
      { status: MessageStatus.READ },
    );
    return result.modifiedCount;
  }

  //get user last seen
  async getUserLastSeen(
    userId: mongoose.Types.ObjectId,
  ): Promise<string | null> {
    const user = await this.userModel
      .findById(userId)
      .select('lastSeen')
      .exec();

    if (!user || !user.lastSeen) {
      Logger.warn(
        `User with userId: ${userId.toString()} not found or has no lastSeen timestamp`,
      );
      return null;
    }

    return user.lastSeen.toISOString();
  }

  //get user online status
  async getUserOnlineStatus(
    userId: mongoose.Types.ObjectId,
  ): Promise<{ isOnline: boolean; lastSeen: Date | null }> {
    const user = await this.userModel
      .findById(userId)
      .select('isOnline lastSeen')
      .exec();
    if (!user) {
      Logger.warn(
        `User with userId: ${userId.toString()} not found for online status check`,
      );
      return { isOnline: false, lastSeen: null };
    }
    return {
      isOnline: user.isOnline ?? false,
      lastSeen: user.lastSeen ?? null,
    };
  }

  async chatRoom(userId: mongoose.Types.ObjectId) {
    const privateChatQuery = {
      $or: [{ sender: userId }, { receiver: userId }],
    };

    const privateChats = await this.chatModel
      .aggregate([
        { $match: privateChatQuery },
        { $sort: { createdAt: -1 } },
        {
          $group: {
            _id: {
              $cond: [{ $ne: ['$sender', userId] }, '$sender', '$receiver'],
            },
            lastestMessageTime: { $first: '$createdAt' },
            lastestMessage: { $first: '$message' },
            sender: { $first: '$sender' },
            messages: {
              $push: {
                sender: '$sender',
                receiver: '$receiver',
                status: '$status',
              },
            },
          },
        },
        {
          $lookup: {
            from: 'users',
            localField: '_id',
            foreignField: '_id',
            as: 'userDetails',
          },
        },
        {
          $unwind: '$userDetails',
        },
        {
          $project: {
            _id: 0,
            chatType: 'private',
            messageId: '$lastestMessageId',
            username: '$userDetails.username',
            userId: '$userDetails._id',
            lastestMessage: 1,
            lastestMessageTime: 1,
            senderId: 1,
            unreadCount: {
              $size: {
                $filter: {
                  input: '$messages',
                  as: 'msg',
                  cond: {
                    $and: [
                      { $eq: ['$$msg.receiver', userId] },
                      {
                        $in: [
                          '$$msg.status',
                          [MessageStatus.SENT, MessageStatus.DELIVERED],
                        ],
                      },
                    ],
                  },
                },
              },
            },
            latestMessageStatus: {
              $cond: [
                { $eq: ['$sender', userId] },
                {
                  $arrayElemAt: [
                    {
                      $map: {
                        input: {
                          $filter: {
                            input: '$messages',
                            as: 'msg',
                            cond: { $eq: ['$$msg.sender', userId] },
                          },
                        },
                        as: 'sentMsg',
                        in: '$$sentMsg.status',
                      },
                    },
                    0,
                  ],
                },
                null,
              ],
            },
          },
        },
      ])
      .exec();

    return privateChats.sort((a, b) => {
      return b.lastestMessageTime.getTime() - a.lastestMessageTime.getTime();
    });
  }
}
