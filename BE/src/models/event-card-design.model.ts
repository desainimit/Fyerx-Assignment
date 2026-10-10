import { type NonAttribute, type Optional } from 'sequelize';
import {
  BelongsTo,
  Column,
  DataType,
  ForeignKey,
  Table,
} from 'sequelize-typescript';
import { CARD_THEMES, type CardTheme, type StickerId } from '@constants';
import { stickerArray } from '@validators';
import { AuditModel, type AuditAttributes } from './audit.model';
import { UserModel } from './user.model';
import { EventModel } from './event.model';

export interface EventCardDesignAttributes extends AuditAttributes {
  userId: string;
  eventId: string;
  theme: CardTheme;
  stickers: StickerId[];
}
export type EventCardDesignCreationAttributes = Optional<
  EventCardDesignAttributes,
  keyof AuditAttributes | 'theme' | 'stickers'
>;

@Table({ tableName: 'event_card_designs', underscored: true, timestamps: true })
export class EventCardDesignModel extends AuditModel<
  EventCardDesignAttributes,
  EventCardDesignCreationAttributes
> {
  @ForeignKey(() => UserModel)
  @Column({ type: DataType.UUID, primaryKey: true, allowNull: false })
  declare userId: string;
  @ForeignKey(() => EventModel)
  @Column({ type: DataType.UUID, primaryKey: true, allowNull: false })
  declare eventId: string;
  @Column({
    type: DataType.STRING(16),
    allowNull: false,
    defaultValue: 'sunset',
    validate: { isIn: [[...CARD_THEMES]] },
  })
  declare theme: CardTheme;
  @Column({
    type: DataType.ARRAY(DataType.TEXT),
    allowNull: false,
    defaultValue: [],
    validate: { stickerArray },
  })
  declare stickers: StickerId[];
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
