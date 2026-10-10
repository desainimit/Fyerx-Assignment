import { type NonAttribute, type Optional } from 'sequelize';
import {
  BelongsTo,
  Column,
  DataType,
  ForeignKey,
  HasMany,
  Table,
} from 'sequelize-typescript';
import { finiteDate, httpImageUrl, nonblank } from '@validators';
import { AuditModel, type AuditAttributes } from './audit.model';
import { CategoryModel } from './category.model';
import { EventReminderModel } from './event-reminder.model';
import { EventCardDesignModel } from './event-card-design.model';

export interface EventAttributes extends AuditAttributes {
  id: string;
  title: string;
  categoryCode: string;
  city: string;
  startsAt: Date;
  pricePaise: number;
  description: string;
  imageUrl: string;
  isActive: boolean;
}
export type EventCreationAttributes = Optional<
  EventAttributes,
  keyof AuditAttributes | 'id' | 'isActive'
>;

@Table({ tableName: 'events', underscored: true, timestamps: true })
export class EventModel extends AuditModel<
  EventAttributes,
  EventCreationAttributes
> {
  @Column({
    type: DataType.UUID,
    primaryKey: true,
    allowNull: false,
    defaultValue: DataType.UUIDV4,
  })
  declare id: string;
  @Column({
    type: DataType.STRING(200),
    allowNull: false,
    validate: { nonblank, len: [1, 200] },
    set(this: EventModel, value: string) {
      this.setDataValue('title', value.trim());
    },
  })
  declare title: string;
  @ForeignKey(() => CategoryModel)
  @Column({ type: DataType.STRING(32), allowNull: false })
  declare categoryCode: string;
  @Column({
    type: DataType.STRING(100),
    allowNull: false,
    validate: { nonblank, len: [1, 100] },
    set(this: EventModel, value: string) {
      this.setDataValue('city', value.trim());
    },
  })
  declare city: string;
  @Column({ type: DataType.DATE, allowNull: false, validate: { finiteDate } })
  declare startsAt: Date;
  @Column({
    type: DataType.INTEGER,
    allowNull: false,
    validate: { isInt: true, min: 0, max: 2147483647 },
  })
  declare pricePaise: number;
  @Column({ type: DataType.TEXT, allowNull: false, validate: { nonblank } })
  declare description: string;
  @Column({ type: DataType.TEXT, allowNull: false, validate: { httpImageUrl } })
  declare imageUrl: string;
  @Column({ type: DataType.BOOLEAN, allowNull: false, defaultValue: true })
  declare isActive: boolean;
  @BelongsTo(() => CategoryModel, {
    foreignKey: 'categoryCode',
    onDelete: 'RESTRICT',
    onUpdate: 'RESTRICT',
  })
  declare category: NonAttribute<CategoryModel>;
  @HasMany(() => EventReminderModel, 'eventId')
  declare reminders: NonAttribute<EventReminderModel[]>;
  @HasMany(() => EventCardDesignModel, 'eventId')
  declare cardDesigns: NonAttribute<EventCardDesignModel[]>;
}
