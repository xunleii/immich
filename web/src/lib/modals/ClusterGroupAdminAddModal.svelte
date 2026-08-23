<script lang="ts">
  import UserAvatar from '$lib/components/shared-components/UserAvatar.svelte';
  import { searchUsersAdmin, type UserResponseDto } from '@immich/sdk';
  import { Button, ListButton, LoadingSpinner, Modal, ModalBody, ModalFooter, Text } from '@immich/ui';
  import { t } from 'svelte-i18n';

  type Props = {
    /** the user being configured, and any users already sharing their cluster group */
    excludedUserIds: string[];
    onClose: (user?: UserResponseDto) => void;
  };

  let { excludedUserIds, onClose }: Props = $props();

  let availableUsers: UserResponseDto[] = $state([]);
  let selectedUser: UserResponseDto | undefined = $state();

  const loadUsers = async () => {
    const users = await searchUsersAdmin({});
    const excluded = new Set(excludedUserIds);
    availableUsers = users.filter(({ id }) => !excluded.has(id));
  };
</script>

<Modal title={$t('admin.add_cluster_group_member')} {onClose} size="small">
  <ModalBody>
    {#await loadUsers()}
      <div class="flex w-full place-content-center place-items-center">
        <LoadingSpinner />
      </div>
    {:then _}
      {#if availableUsers.length > 0}
        <Text size="tiny" color="muted" class="mb-2">{$t('admin.cluster_group_add_description')}</Text>
        <div class="flex max-h-75 immich-scrollbar flex-col gap-2 overflow-y-auto">
          {#each availableUsers as user (user.id)}
            <ListButton onclick={() => (selectedUser = user)} selected={selectedUser?.id === user.id}>
              <UserAvatar {user} size="md" />
              <div class="grow text-start">
                <Text fontWeight="medium">{user.name}</Text>
                <Text size="tiny" color="muted">{user.email}</Text>
              </div>
            </ListButton>
          {/each}
        </div>

        <ModalFooter>
          <Button shape="round" fullWidth onclick={() => onClose(selectedUser)} disabled={!selectedUser}>
            {$t('add')}
          </Button>
        </ModalFooter>
      {:else}
        <Text color="muted">{$t('admin.cluster_group_no_more_users')}</Text>
      {/if}
    {/await}
  </ModalBody>
</Modal>
