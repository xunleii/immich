import { createZodDto } from 'nestjs-zod';
import { UserResponseSchema } from 'src/dtos/user.dto';
import z from 'zod';

export const ClusterGroupAdminAddMemberSchema = z
  .object({
    userId: z
      .uuidv4()
      .describe(
        "User to merge into this account's cluster group. Both accounts will then share the same named " +
          '(recognized) people across their libraries. Bypasses the normal invite/accept flow - admin only.',
      ),
  })
  .meta({ id: 'ClusterGroupAdminAddMemberDto' });

export class ClusterGroupAdminAddMemberDto extends createZodDto(ClusterGroupAdminAddMemberSchema) {}

export const ClusterGroupAdminMembersResponseSchema = z
  .object({
    members: z
      .array(UserResponseSchema)
      .describe('Users currently sharing facial recognition (named people) with this account, including itself.'),
  })
  .meta({ id: 'ClusterGroupAdminMembersResponseDto' });

export class ClusterGroupAdminMembersResponseDto extends createZodDto(ClusterGroupAdminMembersResponseSchema) {}
