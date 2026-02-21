import { Injectable, Logger } from '@nestjs/common';
import { randomBytes } from 'crypto';
import {
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from 'src/common/exceptions/http-exceptions';
import { Chat, ChatType, MessageStatus } from './schemas/chat.schema';
import { Group } from './schemas/group.schema';
import mongoose, { Model } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';
import { CreateMessageDto } from './dto/create-message.dto';
import { MessageResponseDto } from './dto/message-response.dto';
import { FetchChatMessagesDto } from './dto/fetch-chat-messages.dto';
import { CreateGroupDto, UpdateGroupDto } from './dto/group.dto';
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
    @InjectModel(Group.name) private readonly groupModel: Model<Group>,
  ) {}

  // ==================== MESSAGE OPERATIONS ====================

  //create message for both private and group
  async createMessage(
    createMessageDto: CreateMessageDto,
  ): Promise<MessageResponseDto> {
    const {
      chatRoomId,
      chatType,
      sender,
      receiver,
      groupId,
      message,
      attachment,
      status,
    } = createMessageDto;

    // Always generate messageId server-side – ignore any client-provided value
    const messageId = new mongoose.Types.ObjectId().toHexString();

    const messageObject: any = {
      chatRoomId,
      messageId,
      chatType: chatType || ChatType.PRIVATE,
      sender,
      message,
      status: status || MessageStatus.SENT,
    };

    if (attachment) {
      messageObject.attachment = attachment;
    }

    // Private message
    if (chatType === ChatType.PRIVATE && receiver) {
      messageObject.receiver = receiver;
    }

    // Group message
    if (chatType === ChatType.GROUP && groupId) {
      messageObject.groupId = groupId;
      messageObject.readBy = [sender]; // Mark sender as read
    }

    const createdMessage = new this.chatModel(messageObject);
    const savedMessage = await createdMessage.save();
    return savedMessage.toObject() as MessageResponseDto;
  }

  //fetch chat messages for private and group
  async fetchChatMessages(
    FetchChatMessagesDto: FetchChatMessagesDto,
  ): Promise<MessageResponseDto[]> {
    const {
      currentUserId,
      senderId,
      receiverId,
      groupId,
      page = 1,
      limit = 20,
    } = FetchChatMessagesDto;

    let query: any = {};

    // Private message fetch
    if (!groupId) {
      if (!senderId || !receiverId) {
        throw new Error(
          'senderId and receiverId are required for private messages',
        );
      }
      const getRoomId = generateChatRoomId(senderId, receiverId);
      query = {
        chatRoomId: getRoomId,
        chatType: ChatType.PRIVATE,
      };

      // Mark all unread messages delivered to currentUserId as delivered
      const unDeliveredQuery = {
        chatRoomId: getRoomId,
        receiver: new mongoose.Types.ObjectId(currentUserId),
        status: MessageStatus.SENT,
        chatType: ChatType.PRIVATE,
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
    } else {
      // Group message fetch
      query = {
        groupId: new mongoose.Types.ObjectId(groupId),
        chatType: ChatType.GROUP,
      };
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
        {
          $lookup: {
            from: 'users',
            localField: 'sender',
            foreignField: '_id',
            as: 'senderDetails',
          },
        },
        {
          $unwind: {
            path: '$senderDetails',
            preserveNullAndEmptyArrays: true,
          },
        },
      ])
      .exec();

    if (messages.length === 0) {
      Logger.log(
        `No messages found for query: ${JSON.stringify(query)} with currentUserId ${currentUserId.toString()}`,
      );
    }

    return messages.reverse();
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

  // Mark message as read by group member
  async markMessageAsReadByGroupMember(
    messageId: string,
    userId: mongoose.Types.ObjectId,
  ): Promise<MessageResponseDto> {
    const updatedMessage = await this.chatModel.findOneAndUpdate(
      { messageId, chatType: ChatType.GROUP },
      {
        $addToSet: { readBy: userId },
        $set: { status: MessageStatus.READ },
      },
      { new: true },
    );

    if (!updatedMessage) {
      Logger.warn(`Message with messageId: ${messageId} not found`);
      throw new NotFoundException('Message not found');
    }

    return updatedMessage.toObject() as MessageResponseDto;
  }

  //get undelivered messages for a user (private)
  async getUndeliveredMessages(
    userId: mongoose.Types.ObjectId,
    partnerId: mongoose.Types.ObjectId,
  ): Promise<MessageResponseDto[]> {
    const undeliveredMessages = await this.chatModel.find({
      receiver: userId,
      sender: partnerId,
      status: MessageStatus.SENT,
      chatType: ChatType.PRIVATE,
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
    return undeliveredMessages.map(
      (msg) => msg.toObject() as MessageResponseDto,
    );
  }

  // Set user online/offline status in database
  async setUserOnlineStatus(
    userId: mongoose.Types.ObjectId,
    isOnline: boolean,
  ): Promise<void> {
    await this.userModel.findByIdAndUpdate(userId, {
      isOnline,
      ...(isOnline ? {} : { lastSeen: new Date() }),
    });
  }

  //update user last seen timestamp
  async updateUserLastSeen(
    userId: mongoose.Types.ObjectId,
    lastSeen: Date,
  ): Promise<UserLastSeenUpdate> {
    const updatedUser = await this.userModel.findOneAndUpdate(
      { _id: userId } as Record<string, any>,
      { lastSeen, isOnline: false },
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

  //mark messages as delivered for a user (private)
  async markMessagesAsDelivered(
    userId: mongoose.Types.ObjectId,
    partnerId: mongoose.Types.ObjectId,
  ): Promise<number> {
    const result = await this.chatModel.updateMany(
      {
        receiver: userId,
        sender: partnerId,
        status: MessageStatus.SENT,
        chatType: ChatType.PRIVATE,
      },
      { status: MessageStatus.DELIVERED },
    );
    return result.modifiedCount;
  }

  //mark messages as read for a user (private)
  async markMessagesAsRead(
    userId: mongoose.Types.ObjectId,
    partnerId: mongoose.Types.ObjectId,
  ): Promise<number> {
    const result = await this.chatModel.updateMany(
      {
        receiver: userId,
        sender: partnerId,
        status: { $in: [MessageStatus.SENT, MessageStatus.DELIVERED] },
        chatType: ChatType.PRIVATE,
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

  // ==================== PRIVATE CHAT OPERATIONS ====================

  async chatRoom(userId: mongoose.Types.ObjectId) {
    const privateChatQuery = {
      chatType: ChatType.PRIVATE,
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
            avatar: '$userDetails.avatar',
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

  // ==================== GROUP CHAT OPERATIONS ====================

  // Generate a random 10-character alphanumeric invite code
  private generateInviteCode(): string {
    return randomBytes(8).toString('hex').slice(0, 10).toUpperCase();
  }

  // Create a new group
  async createGroup(
    createGroupDto: CreateGroupDto,
    createdBy: mongoose.Types.ObjectId,
  ): Promise<any> {
    const { groupName, groupDescription, groupAvatar, members } =
      createGroupDto;

    const groupObject = {
      groupName,
      groupDescription,
      groupAvatar,
      createdBy,
      members: [createdBy, ...members], // Add creator + other members
      admins: [createdBy],
      isActive: true,
      inviteCode: this.generateInviteCode(),
    };

    const createdGroup = new this.groupModel(groupObject);
    const savedGroup = await createdGroup.save();

    Logger.log(
      `Created group: ${groupName} with ID: ${String(savedGroup._id)}`,
    );
    return savedGroup.toObject();
  }

  // Join a group via invite code
  async joinGroupByInviteCode(
    userId: mongoose.Types.ObjectId,
    inviteCode: string,
  ): Promise<any> {
    const group = await this.groupModel.findOne({ inviteCode, isActive: true });

    if (!group) {
      throw new NotFoundException('Invalid or expired invite link');
    }

    const alreadyMember = group.members.some((m) =>
      new mongoose.Types.ObjectId(m).equals(userId),
    );

    if (alreadyMember) {
      throw new BadRequestException('You are already a member of this group');
    }

    const updated = await this.groupModel
      .findByIdAndUpdate(
        group._id,
        { $addToSet: { members: userId } },
        { new: true },
      )
      .populate('members', 'username email avatar isOnline lastSeen')
      .populate('createdBy', 'username email avatar');

    Logger.log(
      `User ${userId.toString()} joined group ${String(group._id)} via invite link`,
    );
    return updated;
  }

  // Revoke and regenerate a group's invite code (admin only)
  async revokeGroupInviteCode(
    groupId: mongoose.Types.ObjectId,
    requestingUserId: mongoose.Types.ObjectId,
  ): Promise<{ inviteCode: string }> {
    const group = await this.groupModel.findById(groupId);

    if (!group) {
      throw new NotFoundException('Group not found');
    }

    const isAdmin = group.admins.some((a) =>
      new mongoose.Types.ObjectId(a).equals(requestingUserId),
    );

    if (!isAdmin) {
      throw new ForbiddenException(
        'Only group admins can revoke the invite link',
      );
    }

    const newCode = this.generateInviteCode();
    await this.groupModel.findByIdAndUpdate(groupId, {
      inviteCode: newCode,
    });

    Logger.log(`Invite code revoked for group ${groupId.toString()}`);
    return { inviteCode: newCode };
  }

  // Get group details
  async getGroupDetails(groupId: mongoose.Types.ObjectId): Promise<any> {
    const group = await this.groupModel
      .findById(groupId)
      .populate('members', 'username email avatar isOnline lastSeen')
      .populate('admins', 'username email')
      .populate('createdBy', 'username email avatar')
      .exec();

    if (!group) {
      Logger.warn(`Group with ID: ${groupId.toString()} not found`);
      throw new NotFoundException('Group not found');
    }

    return group.toObject();
  }

  // Update group details
  async updateGroup(
    groupId: mongoose.Types.ObjectId,
    updateGroupDto: UpdateGroupDto,
  ): Promise<any> {
    const updatedGroup = await this.groupModel.findByIdAndUpdate(
      groupId,
      updateGroupDto,
      { new: true },
    );

    if (!updatedGroup) {
      Logger.warn(`Group with ID: ${groupId.toString()} not found`);
      throw new NotFoundException('Group not found');
    }

    Logger.log(`Updated group: ${groupId.toString()}`);
    return updatedGroup.toObject();
  }

  // Add member to group
  async addGroupMember(
    groupId: mongoose.Types.ObjectId,
    userId: mongoose.Types.ObjectId,
  ): Promise<any> {
    const updatedGroup = await this.groupModel.findByIdAndUpdate(
      groupId,
      { $addToSet: { members: userId } },
      { new: true },
    );

    if (!updatedGroup) {
      Logger.warn(`Group with ID: ${groupId.toString()} not found`);
      throw new NotFoundException('Group not found');
    }

    Logger.log(
      `Added user ${userId.toString()} to group ${groupId.toString()}`,
    );
    return updatedGroup.toObject();
  }

  // Remove member from group
  async removeGroupMember(
    groupId: mongoose.Types.ObjectId,
    userId: mongoose.Types.ObjectId,
  ): Promise<any> {
    const updatedGroup = await this.groupModel.findByIdAndUpdate(
      groupId,
      { $pull: { members: userId, admins: userId } },
      { new: true },
    );

    if (!updatedGroup) {
      Logger.warn(`Group with ID: ${groupId.toString()} not found`);
      throw new NotFoundException('Group not found');
    }

    Logger.log(
      `Removed user ${userId.toString()} from group ${groupId.toString()}`,
    );
    return updatedGroup.toObject();
  }

  // Get all groups for a user
  async getUserGroups(userId: mongoose.Types.ObjectId): Promise<any[]> {
    const groups = await this.groupModel
      .find({ members: userId, isActive: true })
      .populate('createdBy', 'username email avatar')
      .populate('admins', 'username email')
      .sort({ createdAt: -1 })
      .exec();

    Logger.log(`Found ${groups.length} groups for user ${userId.toString()}`);
    return groups;
  }

  // Get group chat list with latest message
  async getGroupChatRooms(userId: mongoose.Types.ObjectId): Promise<any[]> {
    const groups = await this.groupModel
      .find({ members: userId, isActive: true })
      .sort({ createdAt: -1 })
      .exec();

    const groupChatRooms = await Promise.all(
      groups.map(async (group: any) => {
        const latestMessage = await this.chatModel
          .findOne({ groupId: group._id, chatType: ChatType.GROUP })
          .sort({ createdAt: -1 })
          .populate('sender', 'username avatar')
          .exec();

        const unreadCount = await this.chatModel.countDocuments({
          groupId: group._id,
          chatType: ChatType.GROUP,
          $expr: {
            $not: {
              $in: [new mongoose.Types.ObjectId(userId), '$readBy'],
            },
          },
        });

        const groupCreatedAt = group.createdAt || new Date();
        const messageCreatedAt =
          (latestMessage as any)?.createdAt || groupCreatedAt;

        return {
          _id: group._id,
          chatType: 'group',
          groupName: group.groupName,
          groupAvatar: group.groupAvatar,
          membersCount: group.members.length,
          lastestMessage: latestMessage?.message || 'No messages yet',
          lastestMessageTime: messageCreatedAt,
          senderName: (latestMessage?.sender as any)?.username || 'System',
          senderAvatar: (latestMessage?.sender as any)?.avatar || null,
          unreadCount,
        };
      }),
    );

    return groupChatRooms.sort((a, b) => {
      const aTime = new Date(String(a.lastestMessageTime)).getTime();
      const bTime = new Date(String(b.lastestMessageTime)).getTime();
      return bTime - aTime;
    });
  }

  // Delete group
  async deleteGroup(groupId: mongoose.Types.ObjectId): Promise<void> {
    const result = await this.groupModel.findByIdAndUpdate(
      groupId,
      { isActive: false },
      { new: true },
    );

    if (!result) {
      Logger.warn(`Group with ID: ${groupId.toString()} not found`);
      throw new NotFoundException('Group not found');
    }

    Logger.log(`Deleted group: ${groupId.toString()}`);
  }

  // Search groups by name
  async searchGroups(searchQuery: string): Promise<any[]> {
    // Escape special regex characters to prevent ReDoS
    const escaped = searchQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const groups = await this.groupModel
      .find({
        groupName: { $regex: escaped, $options: 'i' },
        isActive: true,
      })
      .limit(20)
      .exec();

    return groups;
  }
}
