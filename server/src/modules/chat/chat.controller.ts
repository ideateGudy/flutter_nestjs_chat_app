import {
  Controller,
  Post,
  Get,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import type { RequestWithUser } from 'src/common/interfaces/request-with-user.interface';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { ChatService } from './chat.service';
import { CreateMessageDto } from './dto/create-message.dto';
import { FetchChatMessagesDto } from './dto/fetch-chat-messages.dto';
import { MessageResponseDto } from './dto/message-response.dto';
import {
  CreateGroupDto,
  UpdateGroupDto,
  AddGroupMemberDto,
} from './dto/group.dto';
import { UserLastSeenUpdate } from './chat.service';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { MessageStatus } from './schemas/chat.schema';
import mongoose from 'mongoose';

@ApiTags('Chat')
@Controller('chat')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  // ==================== MESSAGE ENDPOINTS ====================

  // Create a new message
  @Post('message')
  @ApiOperation({ summary: 'Create a new message' })
  @ApiResponse({
    status: 201,
    description: 'Message created successfully',
    type: MessageResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid message data' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async createMessage(
    @Body() createMessageDto: CreateMessageDto,
    @Req() req: RequestWithUser,
  ): Promise<MessageResponseDto> {
    // Always use the authenticated user as sender – never trust the request body
    createMessageDto.sender = new mongoose.Types.ObjectId(req.user.sub);
    return this.chatService.createMessage(createMessageDto);
  }

  // Fetch chat messages for a conversation
  @Post('messages/fetch')
  @ApiOperation({ summary: 'Fetch messages for a conversation' })
  @ApiResponse({
    status: 200,
    description: 'Messages fetched successfully',
    type: [MessageResponseDto],
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async fetchChatMessages(
    @Body() fetchChatMessagesDto: FetchChatMessagesDto,
  ): Promise<MessageResponseDto[]> {
    return this.chatService.fetchChatMessages(fetchChatMessagesDto);
  }

  // Update message status by ID
  @Put('message/:messageId/status')
  @ApiOperation({ summary: 'Update message status' })
  @ApiParam({
    name: 'messageId',
    required: true,
    description: 'Message ID',
  })
  @ApiResponse({
    status: 200,
    description: 'Message status updated successfully',
    type: MessageResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Message not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async updateMessageStatus(
    @Param('messageId') messageId: string,
    @Body() body: { status: MessageStatus },
  ): Promise<MessageResponseDto> {
    return this.chatService.updateMessageStatus(messageId, body.status);
  }

  // Get undelivered messages
  @Get('messages/undelivered/:userId/:partnerId')
  @ApiOperation({ summary: 'Get undelivered messages from a specific user' })
  @ApiParam({
    name: 'userId',
    required: true,
    description: 'Receiver user ID',
  })
  @ApiParam({
    name: 'partnerId',
    required: true,
    description: 'Sender user ID',
  })
  @ApiResponse({
    status: 200,
    description: 'Undelivered messages retrieved successfully',
    type: [MessageResponseDto],
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getUndeliveredMessages(
    @Param('userId') userId: string,
    @Param('partnerId') partnerId: string,
  ): Promise<MessageResponseDto[]> {
    return this.chatService.getUndeliveredMessages(
      new mongoose.Types.ObjectId(userId),
      new mongoose.Types.ObjectId(partnerId),
    );
  }

  // ==================== USER PRESENCE ENDPOINTS ====================

  // Update user last seen timestamp
  @Put('user/:userId/last-seen')
  @ApiOperation({ summary: 'Update user last seen timestamp' })
  @ApiParam({
    name: 'userId',
    required: true,
    description: 'User ID',
  })
  @ApiResponse({
    status: 200,
    description: 'Last seen timestamp updated successfully',
  })
  @ApiResponse({ status: 404, description: 'User not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async updateUserLastSeen(
    @Param('userId') userId: string,
    @Body() body: { lastSeen: Date },
  ): Promise<UserLastSeenUpdate> {
    return this.chatService.updateUserLastSeen(
      new mongoose.Types.ObjectId(userId),
      new Date(body.lastSeen),
    );
  }

  // Mark messages as delivered
  @Put('messages/delivered/:userId/:partnerId')
  @ApiOperation({ summary: 'Mark messages as delivered' })
  @ApiParam({
    name: 'userId',
    required: true,
    description: 'Receiver user ID',
  })
  @ApiParam({
    name: 'partnerId',
    required: true,
    description: 'Sender user ID',
  })
  @ApiResponse({
    status: 200,
    description: 'Messages marked as delivered successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async markMessagesAsDelivered(
    @Param('userId') userId: string,
    @Param('partnerId') partnerId: string,
  ): Promise<{ modifiedCount: number }> {
    const modifiedCount = await this.chatService.markMessagesAsDelivered(
      new mongoose.Types.ObjectId(userId),
      new mongoose.Types.ObjectId(partnerId),
    );
    return { modifiedCount };
  }

  // Mark messages as read
  @Put('messages/read/:userId/:partnerId')
  @ApiOperation({ summary: 'Mark messages as read' })
  @ApiParam({
    name: 'userId',
    required: true,
    description: 'Receiver user ID',
  })
  @ApiParam({
    name: 'partnerId',
    required: true,
    description: 'Sender user ID',
  })
  @ApiResponse({
    status: 200,
    description: 'Messages marked as read successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async markMessagesAsRead(
    @Param('userId') userId: string,
    @Param('partnerId') partnerId: string,
  ): Promise<{ modifiedCount: number }> {
    const modifiedCount = await this.chatService.markMessagesAsRead(
      new mongoose.Types.ObjectId(userId),
      new mongoose.Types.ObjectId(partnerId),
    );
    return { modifiedCount };
  }

  // Get user's last seen timestamp
  @Get('user/:userId/last-seen')
  @ApiOperation({ summary: 'Get user last seen timestamp' })
  @ApiParam({
    name: 'userId',
    required: true,
    description: 'User ID',
  })
  @ApiResponse({
    status: 200,
    description: 'Last seen timestamp retrieved successfully',
  })
  @ApiResponse({ status: 404, description: 'User not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getUserLastSeen(
    @Param('userId') userId: string,
  ): Promise<{ lastSeen: string | null }> {
    const lastSeen = await this.chatService.getUserLastSeen(
      new mongoose.Types.ObjectId(userId),
    );
    return { lastSeen };
  }

  // Get user's online status
  @Get('user/:userId/online-status')
  @ApiOperation({ summary: 'Get user online status' })
  @ApiParam({
    name: 'userId',
    required: true,
    description: 'User ID',
  })
  @ApiResponse({
    status: 200,
    description: 'Online status retrieved successfully',
  })
  @ApiResponse({ status: 404, description: 'User not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getUserOnlineStatus(
    @Param('userId') userId: string,
  ): Promise<{ isOnline: boolean; lastSeen: Date | null }> {
    return this.chatService.getUserOnlineStatus(
      new mongoose.Types.ObjectId(userId),
    );
  }

  // Get chat rooms for a user
  @Get('rooms/:userId')
  @ApiOperation({ summary: 'Get all private chat rooms for a user' })
  @ApiParam({
    name: 'userId',
    required: true,
    description: 'User ID',
  })
  @ApiResponse({
    status: 200,
    description: 'Chat rooms retrieved successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getChatRooms(@Param('userId') userId: string) {
    return this.chatService.chatRoom(new mongoose.Types.ObjectId(userId));
  }

  // ==================== GROUP ENDPOINTS ====================

  // Create a new group
  @Post('group')
  @ApiOperation({ summary: 'Create a new group chat' })
  @ApiResponse({
    status: 201,
    description: 'Group created successfully',
  })
  @ApiResponse({ status: 400, description: 'Invalid group data' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async createGroup(
    @Body() createGroupDto: CreateGroupDto,
    @Req() req: RequestWithUser,
  ) {
    const userId = req.user.sub;
    return this.chatService.createGroup(
      createGroupDto,
      new mongoose.Types.ObjectId(userId),
    );
  }

  // Get group details
  @Get('group/:groupId')
  @ApiOperation({ summary: 'Get group details' })
  @ApiParam({
    name: 'groupId',
    required: true,
    description: 'Group ID',
  })
  @ApiResponse({
    status: 200,
    description: 'Group details retrieved successfully',
  })
  @ApiResponse({ status: 404, description: 'Group not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getGroupDetails(@Param('groupId') groupId: string) {
    return this.chatService.getGroupDetails(
      new mongoose.Types.ObjectId(groupId),
    );
  }

  // Update group details
  @Put('group/:groupId')
  @ApiOperation({ summary: 'Update group details' })
  @ApiParam({
    name: 'groupId',
    required: true,
    description: 'Group ID',
  })
  @ApiResponse({
    status: 200,
    description: 'Group updated successfully',
  })
  @ApiResponse({ status: 404, description: 'Group not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async updateGroup(
    @Param('groupId') groupId: string,
    @Body() updateGroupDto: UpdateGroupDto,
  ) {
    return this.chatService.updateGroup(
      new mongoose.Types.ObjectId(groupId),
      updateGroupDto,
    );
  }

  // Add member to group
  @Post('group/:groupId/member')
  @ApiOperation({ summary: 'Add member to group' })
  @ApiParam({
    name: 'groupId',
    required: true,
    description: 'Group ID',
  })
  @ApiResponse({
    status: 200,
    description: 'Member added successfully',
  })
  @ApiResponse({ status: 404, description: 'Group not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async addGroupMember(
    @Param('groupId') groupId: string,
    @Body() addGroupMemberDto: AddGroupMemberDto,
  ) {
    return this.chatService.addGroupMember(
      new mongoose.Types.ObjectId(groupId),
      addGroupMemberDto.userId,
    );
  }

  // Remove member from group
  @Delete('group/:groupId/member/:userId')
  @ApiOperation({ summary: 'Remove member from group' })
  @ApiParam({
    name: 'groupId',
    required: true,
    description: 'Group ID',
  })
  @ApiParam({
    name: 'userId',
    required: true,
    description: 'User ID',
  })
  @ApiResponse({
    status: 200,
    description: 'Member removed successfully',
  })
  @ApiResponse({ status: 404, description: 'Group not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async removeGroupMember(
    @Param('groupId') groupId: string,
    @Param('userId') userId: string,
  ) {
    return this.chatService.removeGroupMember(
      new mongoose.Types.ObjectId(groupId),
      new mongoose.Types.ObjectId(userId),
    );
  }

  // Get all groups for a user
  @Get('user/:userId/groups')
  @ApiOperation({ summary: 'Get all groups for a user' })
  @ApiParam({
    name: 'userId',
    required: true,
    description: 'User ID',
  })
  @ApiResponse({
    status: 200,
    description: 'User groups retrieved successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getUserGroups(@Param('userId') userId: string) {
    return this.chatService.getUserGroups(new mongoose.Types.ObjectId(userId));
  }

  // Get group chat rooms with latest messages
  @Get('group-rooms/:userId')
  @ApiOperation({
    summary: 'Get group chat rooms for a user with latest messages',
  })
  @ApiParam({
    name: 'userId',
    required: true,
    description: 'User ID',
  })
  @ApiResponse({
    status: 200,
    description: 'Group chat rooms retrieved successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getGroupChatRooms(@Param('userId') userId: string) {
    return this.chatService.getGroupChatRooms(
      new mongoose.Types.ObjectId(userId),
    );
  }

  // Delete group
  @Delete('group/:groupId')
  @ApiOperation({ summary: 'Delete a group' })
  @ApiParam({
    name: 'groupId',
    required: true,
    description: 'Group ID',
  })
  @ApiResponse({
    status: 200,
    description: 'Group deleted successfully',
  })
  @ApiResponse({ status: 404, description: 'Group not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async deleteGroup(@Param('groupId') groupId: string) {
    await this.chatService.deleteGroup(new mongoose.Types.ObjectId(groupId));
    return { message: 'Group deleted successfully' };
  }

  // Search groups by name
  @Get('groups/search')
  @ApiOperation({ summary: 'Search groups by name' })
  @ApiResponse({
    status: 200,
    description: 'Groups found successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async searchGroups(@Query('q') searchQuery: string) {
    return this.chatService.searchGroups(searchQuery);
  }
}
