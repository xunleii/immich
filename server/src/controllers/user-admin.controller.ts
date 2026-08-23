import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post, Put, Query } from '@nestjs/common';
import { ApiExcludeEndpoint, ApiTags } from '@nestjs/swagger';
import { Endpoint, HistoryBuilder } from 'src/decorators';
import { AssetStatsDto, AssetStatsResponseDto } from 'src/dtos/asset.dto';
import { AuthDto } from 'src/dtos/auth.dto';
import { CalendarHeatmapDto, CalendarHeatmapResponseDto } from 'src/dtos/calendar-heatmap.dto';
import {
  ClusterGroupAdminAddMemberDto,
  ClusterGroupAdminMembersResponseDto,
} from 'src/dtos/cluster-group-admin.dto';
import { SessionResponseDto } from 'src/dtos/session.dto';
import { UserPreferencesResponseDto, UserPreferencesUpdateDto } from 'src/dtos/user-preferences.dto';
import {
  UserAdminCreateDto,
  UserAdminDeleteDto,
  UserAdminResponseDto,
  UserAdminSearchDto,
  UserAdminUpdateDto,
  UserShareAllowlistResponseDto,
  UserShareAllowlistUpdateDto,
} from 'src/dtos/user.dto';
import { ApiTag, Permission } from 'src/enum';
import { Auth, Authenticated } from 'src/middleware/auth.guard';
import { UserAdminService } from 'src/services/user-admin.service';
import { UUIDParamDto } from 'src/validation';

@ApiTags(ApiTag.UsersAdmin)
@Controller('admin/users')
export class UserAdminController {
  constructor(private service: UserAdminService) {}

  @Get()
  @Authenticated({ permission: Permission.AdminUserRead, admin: true })
  @Endpoint({
    summary: 'Search users',
    description: 'Search for users.',
    history: new HistoryBuilder().added('v1').beta('v1').stable('v2'),
  })
  searchUsersAdmin(@Auth() auth: AuthDto, @Query() dto: UserAdminSearchDto): Promise<UserAdminResponseDto[]> {
    return this.service.search(auth, dto);
  }

  @Post()
  @Authenticated({ permission: Permission.AdminUserCreate, admin: true })
  @Endpoint({
    summary: 'Create a user',
    description: 'Create a new user.',
    history: new HistoryBuilder().added('v1').beta('v1').stable('v2'),
  })
  createUserAdmin(@Body() createUserDto: UserAdminCreateDto): Promise<UserAdminResponseDto> {
    return this.service.create(createUserDto);
  }

  @Get(':id')
  @Authenticated({ permission: Permission.AdminUserRead, admin: true })
  @Endpoint({
    summary: 'Retrieve a user',
    description: 'Retrieve  a specific user by their ID.',
    history: new HistoryBuilder().added('v1').beta('v1').stable('v2'),
  })
  getUserAdmin(@Auth() auth: AuthDto, @Param() { id }: UUIDParamDto): Promise<UserAdminResponseDto> {
    return this.service.get(auth, id);
  }

  @Put(':id')
  @Authenticated({ permission: Permission.AdminUserUpdate, admin: true })
  @Endpoint({
    summary: 'Update a user',
    description: 'Update an existing user.',
    history: new HistoryBuilder()
      .added('v1')
      .beta('v1')
      .stable('v2')
      .deprecated('v3', { replacementId: 'updateUserAdmin' }),
  })
  updateUserAdmin(
    @Auth() auth: AuthDto,
    @Param() { id }: UUIDParamDto,
    @Body() dto: UserAdminUpdateDto,
  ): Promise<UserAdminResponseDto> {
    return this.service.update(auth, id, dto);
  }

  @Patch(':id')
  @ApiExcludeEndpoint()
  @Authenticated({ permission: Permission.AdminUserUpdate, admin: true })
  updateUserAdminV3(
    @Auth() auth: AuthDto,
    @Param() { id }: UUIDParamDto,
    @Body() dto: UserAdminUpdateDto,
  ): Promise<UserAdminResponseDto> {
    return this.service.update(auth, id, dto);
  }

  @Delete(':id')
  @Authenticated({ permission: Permission.AdminUserDelete, admin: true })
  @Endpoint({
    summary: 'Delete a user',
    description: 'Delete a user.',
    history: new HistoryBuilder().added('v1').beta('v1').stable('v2'),
  })
  deleteUserAdmin(
    @Auth() auth: AuthDto,
    @Param() { id }: UUIDParamDto,
    @Body() dto: UserAdminDeleteDto,
  ): Promise<UserAdminResponseDto> {
    return this.service.delete(auth, id, dto);
  }

  @Get(':id/calendar-heatmap')
  @Authenticated({ permission: Permission.AdminUserRead, admin: true })
  @Endpoint({
    summary: 'Retrieve calendar heatmap activity',
    description: 'Retrieve activity counts for a specified period, in a calendar heatmap format.',
    history: new HistoryBuilder().added('v3').stable('v3'),
  })
  getUserCalendarHeatmapAdmin(
    @Auth() auth: AuthDto,
    @Param() { id }: UUIDParamDto,
    @Query() dto: CalendarHeatmapDto,
  ): Promise<CalendarHeatmapResponseDto> {
    return this.service.getCalendarHeatmap(auth, id, dto);
  }

  @Get(':id/sessions')
  @Authenticated({ permission: Permission.AdminSessionRead, admin: true })
  @Endpoint({
    summary: 'Retrieve user sessions',
    description: 'Retrieve all sessions for a specific user.',
    history: new HistoryBuilder().added('v1').beta('v1').stable('v2'),
  })
  getUserSessionsAdmin(@Auth() auth: AuthDto, @Param() { id }: UUIDParamDto): Promise<SessionResponseDto[]> {
    return this.service.getSessions(auth, id);
  }

  @Get(':id/statistics')
  @Authenticated({ permission: Permission.AdminUserRead, admin: true })
  @Endpoint({
    summary: 'Retrieve user statistics',
    description: 'Retrieve asset statistics for a specific user.',
    history: new HistoryBuilder().added('v1').beta('v1').stable('v2'),
  })
  getUserStatisticsAdmin(
    @Auth() auth: AuthDto,
    @Param() { id }: UUIDParamDto,
    @Query() dto: AssetStatsDto,
  ): Promise<AssetStatsResponseDto> {
    return this.service.getStatistics(auth, id, dto);
  }

  @Get(':id/preferences')
  @Authenticated({ permission: Permission.AdminUserRead, admin: true })
  @Endpoint({
    summary: 'Retrieve user preferences',
    description: 'Retrieve the preferences of a specific user.',
    history: new HistoryBuilder().added('v1').beta('v1').stable('v2'),
  })
  getUserPreferencesAdmin(@Auth() auth: AuthDto, @Param() { id }: UUIDParamDto): Promise<UserPreferencesResponseDto> {
    return this.service.getPreferences(auth, id);
  }

  @Put(':id/preferences')
  @Authenticated({ permission: Permission.AdminUserUpdate, admin: true })
  @Endpoint({
    summary: 'Update user preferences',
    description: 'Update the preferences of a specific user.',
    history: new HistoryBuilder()
      .added('v1')
      .beta('v1')
      .stable('v2')
      .deprecated('v3', { replacementId: 'updateUserPreferencesAdmin' }),
  })
  updateUserPreferencesAdmin(
    @Auth() auth: AuthDto,
    @Param() { id }: UUIDParamDto,
    @Body() dto: UserPreferencesUpdateDto,
  ): Promise<UserPreferencesResponseDto> {
    return this.service.updatePreferences(auth, id, dto);
  }

  @Patch(':id/preferences')
  @ApiExcludeEndpoint()
  @Authenticated({ permission: Permission.AdminUserUpdate, admin: true })
  updateUserPreferencesAdminV3(
    @Auth() auth: AuthDto,
    @Param() { id }: UUIDParamDto,
    @Body() dto: UserPreferencesUpdateDto,
  ): Promise<UserPreferencesResponseDto> {
    return this.service.updatePreferences(auth, id, dto);
  }

  @Post(':id/restore')
  @Authenticated({ permission: Permission.AdminUserDelete, admin: true })
  @HttpCode(HttpStatus.OK)
  @Endpoint({
    summary: 'Restore a deleted user',
    description: 'Restore a previously deleted user.',
    history: new HistoryBuilder().added('v1').beta('v1').stable('v2'),
  })
  restoreUserAdmin(@Auth() auth: AuthDto, @Param() { id }: UUIDParamDto): Promise<UserAdminResponseDto> {
    return this.service.restore(auth, id);
  }

  @Get(':id/share-allowlist')
  @Authenticated({ permission: Permission.AdminUserRead, admin: true })
  @Endpoint({
    summary: 'Retrieve share allowlist',
    description:
      'Retrieve the list of users this account is allowed to share albums/assets with. An empty list means the ' +
      'allowlist is not active for this account (sharing is unrestricted).',
    history: new HistoryBuilder().added('v1').stable('v1'),
  })
  getUserShareAllowlistAdmin(
    @Auth() auth: AuthDto,
    @Param() { id }: UUIDParamDto,
  ): Promise<UserShareAllowlistResponseDto> {
    return this.service.getShareAllowlist(auth, id);
  }

  @Put(':id/share-allowlist')
  @Authenticated({ permission: Permission.AdminUserUpdate, admin: true })
  @Endpoint({
    summary: 'Update share allowlist',
    description:
      'Replace the list of users this account is allowed to share albums/assets with. Pass an empty array to ' +
      'disable the allowlist for this account (reverts to unrestricted sharing).',
    history: new HistoryBuilder().added('v1').stable('v1'),
  })
  updateUserShareAllowlistAdmin(
    @Auth() auth: AuthDto,
    @Param() { id }: UUIDParamDto,
    @Body() dto: UserShareAllowlistUpdateDto,
  ): Promise<UserShareAllowlistResponseDto> {
    return this.service.updateShareAllowlist(auth, id, dto);
  }

  @Get(':id/cluster-group/members')
  @Authenticated({ permission: Permission.AdminUserRead, admin: true })
  @Endpoint({
    summary: 'Retrieve cluster group members',
    description:
      'Retrieve the users currently sharing facial recognition (named people) with this account, including itself.',
    history: new HistoryBuilder().added('v1').stable('v1'),
  })
  getUserClusterGroupMembersAdmin(
    @Auth() auth: AuthDto,
    @Param() { id }: UUIDParamDto,
  ): Promise<ClusterGroupAdminMembersResponseDto> {
    return this.service.getClusterGroupMembers(auth, id);
  }

  @Put(':id/cluster-group/members')
  @Authenticated({ permission: Permission.AdminUserUpdate, admin: true })
  @Endpoint({
    summary: 'Add a cluster group member',
    description:
      "Merge another user's cluster group into this account's, so both accounts share the same named " +
      '(recognized) people. Bypasses the normal invite/accept flow.',
    history: new HistoryBuilder().added('v1').stable('v1'),
  })
  addUserClusterGroupMemberAdmin(
    @Auth() auth: AuthDto,
    @Param() { id }: UUIDParamDto,
    @Body() dto: ClusterGroupAdminAddMemberDto,
  ): Promise<ClusterGroupAdminMembersResponseDto> {
    return this.service.addClusterGroupMember(auth, id, dto);
  }

  @Delete(':id/cluster-group/members/:memberId')
  @Authenticated({ permission: Permission.AdminUserUpdate, admin: true })
  @Endpoint({
    summary: 'Remove a cluster group member',
    description:
      "Remove a user from this account's cluster group, giving them a fresh cluster group of their own. " +
      'Stops sharing facial recognition data between the two accounts.',
    history: new HistoryBuilder().added('v1').stable('v1'),
  })
  removeUserClusterGroupMemberAdmin(
    @Auth() auth: AuthDto,
    @Param('id') id: string,
    @Param('memberId') memberId: string,
  ): Promise<ClusterGroupAdminMembersResponseDto> {
    return this.service.removeClusterGroupMember(auth, id, memberId);
  }
}
