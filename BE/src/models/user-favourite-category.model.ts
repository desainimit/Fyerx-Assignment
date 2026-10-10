import { type NonAttribute, type Optional } from 'sequelize';
import {
  BelongsTo,
  Column,
  DataType,
  ForeignKey,
  Table,
} from 'sequelize-typescript';
import { AuditModel, type AuditAttributes } from './audit.model';
import { UserModel } from './user.model';
import { CategoryModel } from './category.model';

export interface UserFavouriteCategoryAttributes extends AuditAttributes {
  userId: string;
  categoryCode: string;
}
export type UserFavouriteCategoryCreationAttributes = Optional<
  UserFavouriteCategoryAttributes,
  keyof AuditAttributes
>;

@Table({
  tableName: 'user_favourite_categories',
  underscored: true,
  timestamps: true,
})
export class UserFavouriteCategoryModel extends AuditModel<
  UserFavouriteCategoryAttributes,
  UserFavouriteCategoryCreationAttributes
> {
  @ForeignKey(() => UserModel)
  @Column({ type: DataType.UUID, primaryKey: true, allowNull: false })
  declare userId: string;
  @ForeignKey(() => CategoryModel)
  @Column({ type: DataType.STRING(32), primaryKey: true, allowNull: false })
  declare categoryCode: string;
  @BelongsTo(() => UserModel, {
    foreignKey: 'userId',
    onDelete: 'CASCADE',
    onUpdate: 'RESTRICT',
  })
  declare user: NonAttribute<UserModel>;
  @BelongsTo(() => CategoryModel, {
    foreignKey: 'categoryCode',
    onDelete: 'RESTRICT',
    onUpdate: 'RESTRICT',
  })
  declare category: NonAttribute<CategoryModel>;
}
