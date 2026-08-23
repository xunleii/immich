import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { mapUserAdmin } from 'src/dtos/user.dto';
import { JobName, UserStatus } from 'src/enum';
import { UserAdminService } from 'src/services/user-admin.service';
import { AuthFactory } from 'test/factories/auth.factory';
import { ClusterGroupFactory } from 'test/factories/cluster-group.factory';
import { UserFactory } from 'test/factories/user.factory';
import { authStub } from 'test/fixtures/auth.stub';
import { userStub } from 'test/fixtures/user.stub';
import { newTestService, ServiceMocks } from 'test/utils';
import { describe } from 'vitest';

describe(UserAdminService.name, () => {
  let sut: UserAdminService;
  let mocks: ServiceMocks;

  beforeEach(() => {
    ({ sut, mocks } = newTestService(UserAdminService));

    mocks.user.get.mockImplementation((userId) =>
      Promise.resolve([userStub.admin, userStub.user1].find((user) => user.id === userId) ?? undefined),
    );
  });

  describe('create', () => {
    it('should not create a user if there is no local admin account', async () => {
      mocks.user.getAdmin.mockResolvedValueOnce(void 0);

      await expect(
        sut.create({
          email: 'john_smith@email.com',
          name: 'John Smith',
          password: 'password',
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('should create user', async () => {
      mocks.user.getAdmin.mockResolvedValue(userStub.admin);
      mocks.user.create.mockResolvedValue(userStub.user1);

      await expect(
        sut.create({
          email: userStub.user1.email,
          name: userStub.user1.name,
          password: 'password',
          storageLabel: 'label',
        }),
      ).resolves.toEqual(mapUserAdmin(userStub.user1));

      expect(mocks.user.getAdmin).toBeCalled();
      expect(mocks.user.create).toBeCalledWith({
        email: userStub.user1.email,
        name: userStub.user1.name,
        storageLabel: 'label',
        password: expect.anything(),
        clusterGroupId: expect.any(String),
      });
    });
  });

  describe('update', () => {
    it('should update the user', async () => {
      const update = {
        shouldChangePassword: true,
        email: 'immich@test.com',
        storageLabel: 'storage_label',
      };
      mocks.user.getByEmail.mockResolvedValue(void 0);
      mocks.user.getByStorageLabel.mockResolvedValue(void 0);
      mocks.user.update.mockResolvedValue(userStub.user1);

      await sut.update(authStub.user1, userStub.user1.id, update);

      expect(mocks.user.getByEmail).toHaveBeenCalledWith(update.email);
      expect(mocks.user.getByStorageLabel).toHaveBeenCalledWith(update.storageLabel);
    });

    it('should not set an empty string for storage label', async () => {
      mocks.user.update.mockResolvedValue(userStub.user1);
      await sut.update(authStub.admin, userStub.user1.id, { storageLabel: '' });
      expect(mocks.user.update).toHaveBeenCalledWith(userStub.user1.id, {
        storageLabel: null,
        updatedAt: expect.any(Date),
      });
    });

    it('should not change an email to one already in use', async () => {
      const dto = { id: userStub.user1.id, email: 'updated@test.com' };

      mocks.user.get.mockResolvedValue(userStub.user1);
      mocks.user.getByEmail.mockResolvedValue(userStub.admin);

      await expect(sut.update(authStub.admin, userStub.user1.id, dto)).rejects.toBeInstanceOf(BadRequestException);

      expect(mocks.user.update).not.toHaveBeenCalled();
    });

    it('should not let the admin change the storage label to one already in use', async () => {
      const dto = { id: userStub.user1.id, storageLabel: 'admin' };

      mocks.user.get.mockResolvedValue(userStub.user1);
      mocks.user.getByStorageLabel.mockResolvedValue(userStub.admin);

      await expect(sut.update(authStub.admin, userStub.user1.id, dto)).rejects.toBeInstanceOf(BadRequestException);

      expect(mocks.user.update).not.toHaveBeenCalled();
    });

    it('update user information should throw error if user not found', async () => {
      mocks.user.get.mockResolvedValueOnce(void 0);

      await expect(
        sut.update(authStub.admin, userStub.user1.id, { shouldChangePassword: true }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('delete', () => {
    it('should throw error if user could not be found', async () => {
      mocks.user.get.mockResolvedValue(void 0);

      await expect(sut.delete(authStub.admin, 'not-found', {})).rejects.toThrowError(BadRequestException);
      expect(mocks.user.delete).not.toHaveBeenCalled();
    });

    it('cannot delete admin user', async () => {
      await expect(sut.delete(authStub.admin, userStub.admin.id, {})).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('should not allow deleting own account', async () => {
      const user = UserFactory.create({ isAdmin: false });
      const auth = AuthFactory.create(user);
      mocks.user.get.mockResolvedValue(user);
      await expect(sut.delete(auth, user.id, {})).rejects.toBeInstanceOf(ForbiddenException);

      expect(mocks.user.delete).not.toHaveBeenCalled();
    });

    it('should delete user', async () => {
      mocks.user.get.mockResolvedValue(userStub.user1);
      mocks.user.update.mockResolvedValue(userStub.user1);

      await expect(sut.delete(authStub.admin, userStub.user1.id, {})).resolves.toEqual(mapUserAdmin(userStub.user1));
      expect(mocks.user.update).toHaveBeenCalledWith(userStub.user1.id, {
        status: UserStatus.Deleted,
        deletedAt: expect.any(Date),
      });
    });

    it('should force delete user', async () => {
      mocks.user.get.mockResolvedValue(userStub.user1);
      mocks.user.update.mockResolvedValue(userStub.user1);

      await expect(sut.delete(authStub.admin, userStub.user1.id, { force: true })).resolves.toEqual(
        mapUserAdmin(userStub.user1),
      );

      expect(mocks.user.update).toHaveBeenCalledWith(userStub.user1.id, {
        status: UserStatus.Removing,
        deletedAt: expect.any(Date),
      });
      expect(mocks.job.queue).toHaveBeenCalledWith({
        name: JobName.UserDelete,
        data: { id: userStub.user1.id, force: true },
      });
    });
  });

  describe('restore', () => {
    it('should throw error if user could not be found', async () => {
      mocks.user.get.mockResolvedValue(void 0);
      await expect(sut.restore(authStub.admin, userStub.admin.id)).rejects.toThrowError(BadRequestException);
      expect(mocks.user.update).not.toHaveBeenCalled();
    });

    it('should restore an user', async () => {
      mocks.user.get.mockResolvedValue(userStub.user1);
      mocks.user.restore.mockResolvedValue(userStub.user1);
      await expect(sut.restore(authStub.admin, userStub.user1.id)).resolves.toEqual(mapUserAdmin(userStub.user1));
      expect(mocks.user.restore).toHaveBeenCalledWith(userStub.user1.id);
    });
  });

  describe('getClusterGroupMembers', () => {
    it('should list the members of the cluster group', async () => {
      const owner = UserFactory.create({ clusterGroupId: 'cluster-a' });
      const member = UserFactory.create({ clusterGroupId: 'cluster-a' });
      mocks.user.get.mockResolvedValue(owner);
      mocks.clusterGroup.getUsers.mockResolvedValue([owner, member]);

      const result = await sut.getClusterGroupMembers(authStub.admin, owner.id);

      expect(mocks.clusterGroup.getUsers).toHaveBeenCalledWith({ clusterGroupId: 'cluster-a', userId: owner.id });
      expect(result.members).toHaveLength(2);
    });
  });

  describe('addClusterGroupMember', () => {
    it('should reject adding a user to their own cluster group', async () => {
      await expect(
        sut.addClusterGroupMember(authStub.admin, userStub.admin.id, { userId: userStub.admin.id }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(mocks.person.reassignCluster).not.toHaveBeenCalled();
    });

    it('should reject if the target is already in the same cluster group', async () => {
      const owner = UserFactory.create({ clusterGroupId: 'cluster-a' });
      const target = UserFactory.create({ clusterGroupId: 'cluster-a' });
      mocks.user.get.mockImplementation((userId) =>
        Promise.resolve([owner, target].find((user) => user.id === userId)),
      );

      await expect(
        sut.addClusterGroupMember(authStub.admin, owner.id, { userId: target.id }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(mocks.person.reassignCluster).not.toHaveBeenCalled();
    });

    it('should merge the target user into the cluster group', async () => {
      const owner = UserFactory.create({ clusterGroupId: 'cluster-a' });
      const target = UserFactory.create({ clusterGroupId: 'cluster-b' });
      mocks.user.get.mockImplementation((userId) =>
        Promise.resolve([owner, target].find((user) => user.id === userId)),
      );
      mocks.clusterGroup.getUsers.mockResolvedValue([owner, target]);

      await sut.addClusterGroupMember(authStub.admin, owner.id, { userId: target.id });

      expect(mocks.person.reassignCluster).toHaveBeenCalledWith({
        userId: target.id,
        newClusterId: 'cluster-a',
      });
      expect(mocks.user.update).toHaveBeenCalledWith(target.id, { clusterGroupId: 'cluster-a' });
    });
  });

  describe('removeClusterGroupMember', () => {
    it('should reject removing a user not in the cluster group', async () => {
      const owner = UserFactory.create({ clusterGroupId: 'cluster-a' });
      const other = UserFactory.create({ clusterGroupId: 'cluster-b' });
      mocks.user.get.mockImplementation((userId) =>
        Promise.resolve([owner, other].find((user) => user.id === userId)),
      );

      await expect(
        sut.removeClusterGroupMember(authStub.admin, owner.id, other.id),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(mocks.person.reassignCluster).not.toHaveBeenCalled();
    });

    it('should give the removed member a fresh cluster group', async () => {
      const owner = UserFactory.create({ clusterGroupId: 'cluster-a' });
      const member = UserFactory.create({ clusterGroupId: 'cluster-a' });
      mocks.user.get.mockImplementation((userId) =>
        Promise.resolve([owner, member].find((user) => user.id === userId)),
      );
      mocks.clusterGroup.create.mockResolvedValue(ClusterGroupFactory.create({ id: 'new-cluster' }));
      mocks.clusterGroup.getUsers.mockResolvedValue([owner]);

      await sut.removeClusterGroupMember(authStub.admin, owner.id, member.id);

      expect(mocks.person.reassignCluster).toHaveBeenCalledWith({
        userId: member.id,
        newClusterId: 'new-cluster',
      });
      expect(mocks.user.update).toHaveBeenCalledWith(member.id, { clusterGroupId: 'new-cluster' });
    });
  });
});
