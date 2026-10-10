import { type NonAttribute, type Optional } from 'sequelize';
import { Column, DataType, HasMany, Table } from 'sequelize-typescript';
import { nonblank } from '@validators';
import { AuditModel, type AuditAttributes } from './audit.model';
import { EventModel } from './event.model';
import { UserFavouriteCategoryModel } from './user-favourite-category.model';

export interface CategoryAttributes extends AuditAttributes {
  code: string;
  name: string;
}
export type CategoryCreationAttributes = Optional<
  CategoryAttributes,
  keyof AuditAttributes
>;

@Table({ tableName: 'categories', underscored: true, timestamps: true })
export class CategoryModel extends AuditModel<
  CategoryAttributes,
  CategoryCreationAttributes
> {
  @Column({
    type: DataType.STRING(32),
    primaryKey: true,
    allowNull: false,
    validate: { is: /^[a-z][a-z0-9-]*$/, len: [1, 32] },
  })
  declare code: string;
  @Column({
    type: DataType.STRING(40),
    allowNull: false,
    validate: { nonblank, len: [1, 40] },
  })
  declare name: string;
  @HasMany(() => EventModel, 'categoryCode')
  declare events: NonAttribute<EventModel[]>;
  @HasMany(() => UserFavouriteCategoryModel, 'categoryCode')
  declare favourites: NonAttribute<UserFavouriteCategoryModel[]>;
}
