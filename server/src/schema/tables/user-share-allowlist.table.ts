import { Column, CreateDateColumn, ForeignKeyColumn, Generated, Table, Timestamp } from '@immich/sql-tools';
import { UserTable } from 'src/schema/tables/user.table';

/**
 * Per-owner share allowlist, activated on demand:
 *
 * - No rows for `ownerId` => sharing is unrestricted (default behavior,
 *   unchanged from stock Immich).
 * - One or more rows for `ownerId` => `ownerId` may ONLY share
 *   albums/assets with the users listed here. Everyone else is denied.
 *
 * Removing the last row for a user turns the restriction back off
 * (reverts to unrestricted), it does not mean "allow nobody".
 */
@Table('user_share_allowlist')
export class UserShareAllowlistTable {
  @ForeignKeyColumn(() => UserTable, {
    onDelete: 'CASCADE',
    primary: true,
    // [ownerId, allowedUserId] is the PK constraint
    index: false,
  })
  ownerId!: string;

  @ForeignKeyColumn(() => UserTable, { onDelete: 'CASCADE', primary: true })
  allowedUserId!: string;

  @CreateDateColumn()
  createdAt!: Generated<Timestamp>;

  @Column({ type: 'uuid' })
  createdBy!: string;
}
