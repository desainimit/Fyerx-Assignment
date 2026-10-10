import type { Optional } from 'sequelize';
import {
  Column,
  CreatedAt,
  DataType,
  Model,
  UpdatedAt,
} from 'sequelize-typescript';

export interface AuditAttributes {
  createdAt: Date;
  updatedAt: Date;
  createdBy: string | null;
  updatedBy: string | null;
}

// Concrete @Table models inherit these columns and add their own attributes.
export abstract class AuditModel<
  TAttributes extends AuditAttributes = AuditAttributes,
  TCreationAttributes extends object = Optional<
    TAttributes,
    keyof AuditAttributes
  >,
> extends Model<TAttributes, TCreationAttributes> {
  @CreatedAt
  declare createdAt: Date;

  @UpdatedAt
  declare updatedAt: Date;

  @Column({ type: DataType.UUID, allowNull: true })
  declare createdBy: string | null;

  @Column({ type: DataType.UUID, allowNull: true })
  declare updatedBy: string | null;
}
