import { type NonAttribute, type Optional } from 'sequelize';
import {
  Column,
  DataType,
  DefaultScope,
  HasMany,
  Scopes,
  Table,
} from 'sequelize-typescript';
import { UserRole } from '@app-types/auth.types';
import { nonblank } from '@validators';
import { AuditModel, type AuditAttributes } from './audit.model';
import { UserFavouriteCategoryModel } from './user-favourite-category.model';
import { EventReminderModel } from './event-reminder.model';
import { EventCardDesignModel } from './event-card-design.model';

export interface UserAttributes extends AuditAttributes {
  id: string;
  email: string;
  passwordHash: string;
  role: UserRole;
}
export type UserCreationAttributes = Optional<
  UserAttributes,
  keyof AuditAttributes | 'id' | 'role'
>;

@DefaultScope(() => ({ attributes: { exclude: ['passwordHash'] } }))
@Scopes(() => ({ authentication: { attributes: { exclude: [] } } }))
@Table({ tableName: 'users', underscored: true, timestamps: true })
export class UserModel extends AuditModel<
  UserAttributes,
  UserCreationAttributes
> {
  @Column({
    type: DataType.UUID,
    primaryKey: true,
    allowNull: false,
    defaultValue: DataType.UUIDV4,
  })
  declare id: string;

  @Column({
    type: DataType.STRING(254),
    allowNull: false,
    unique: 'uq_users_email',
    validate: { isEmail: true, len: [1, 254], nonblank },
    set(this: UserModel, value: string) {
      this.setDataValue('email', value.trim().toLowerCase());
    },
  })
  declare email: string;

  @Column({ type: DataType.TEXT, allowNull: false, validate: { nonblank } })
  declare passwordHash: string;

  @Column({
    type: DataType.STRING(8),
    allowNull: false,
    defaultValue: UserRole.User,
    validate: { isIn: [[UserRole.User, UserRole.Admin]] },
  })
  declare role: UserRole;

  @HasMany(() => UserFavouriteCategoryModel, 'userId')
  declare favouriteCategories: NonAttribute<UserFavouriteCategoryModel[]>;
  @HasMany(() => EventReminderModel, 'userId')
  declare reminders: NonAttribute<EventReminderModel[]>;
  @HasMany(() => EventCardDesignModel, 'userId')
  declare cardDesigns: NonAttribute<EventCardDesignModel[]>;
}
