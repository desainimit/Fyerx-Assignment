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
import { EventModel } from './event.model';

export interface EventReminderAttributes extends AuditAttributes {
  userId: string;
  eventId: string;
  enabled: boolean;
}
export type EventReminderCreationAttributes = Optional<
  EventReminderAttributes,
  keyof AuditAttributes | 'enabled'
>;

@Table({ tableName: 'event_reminders', underscored: true, timestamps: true })
export class EventReminderModel extends AuditModel<
  EventReminderAttributes,
  EventReminderCreationAttributes
> {
  @ForeignKey(() => UserModel)
  @Column({ type: DataType.UUID, primaryKey: true, allowNull: false })
  declare userId: string;
  @ForeignKey(() => EventModel)
  @Column({ type: DataType.UUID, primaryKey: true, allowNull: false })
  declare eventId: string;
  @Column({ type: DataType.BOOLEAN, allowNull: false, defaultValue: true })
  declare enabled: boolean;
  @BelongsTo(() => UserModel, {
    foreignKey: 'userId',
    onDelete: 'CASCADE',
    onUpdate: 'RESTRICT',
  })
  declare user: NonAttribute<UserModel>;
  @BelongsTo(() => EventModel, {
    foreignKey: 'eventId',
    onDelete: 'RESTRICT',
    onUpdate: 'RESTRICT',
  })
  declare event: NonAttribute<EventModel>;
}
