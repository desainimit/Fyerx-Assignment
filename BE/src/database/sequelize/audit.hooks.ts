import type { ModelHooks } from 'sequelize/types/hooks';
import type { Model } from 'sequelize';
import { AuditModel } from '@models';
import { getAuditActorId } from '@context/request-context';

const creationFields = ['createdBy', 'createdAt'];
const updateFields = ['updatedBy', 'updatedAt'];

function stampCreation(instance: AuditModel): void {
  const now = new Date();
  instance.setDataValue('createdBy', getAuditActorId());
  instance.setDataValue('updatedBy', getAuditActorId());
  instance.setDataValue('createdAt', now);
  instance.setDataValue('updatedAt', now);
}

function stampUpdate(instance: AuditModel): void {
  // Preserve originals even when a caller supplies forged creation attributes.
  for (const field of ['createdBy', 'createdAt'] as const) {
    if (instance.changed(field)) {
      const original = instance.previous(field);
      if (original !== undefined) instance.setDataValue(field, original);
      else Reflect.deleteProperty(instance.dataValues, field);
      instance.changed(field, false);
    }
  }
  instance.setDataValue('updatedBy', getAuditActorId());
  instance.setDataValue('updatedAt', new Date());
}

function isAuditedModel(model: unknown): boolean {
  return typeof model === 'function' && model.prototype instanceof AuditModel;
}

function addFields(options: { fields?: string[] }, fields: string[]): void {
  if (options.fields)
    options.fields = [...new Set([...options.fields, ...fields])];
}

// Permanent Sequelize hooks apply to every registered AuditModel subclass.
export function createAuditHooks(): Partial<
  ModelHooks<Model, Record<string, unknown>>
> {
  return {
    beforeValidate(instance) {
      if (!(instance instanceof AuditModel)) return;
      if (instance.isNewRecord) stampCreation(instance);
      else stampUpdate(instance);
    },
    beforeCreate(instance, options) {
      if (!(instance instanceof AuditModel)) return;
      stampCreation(instance);
      addFields(options, [...creationFields, ...updateFields]);
    },
    beforeUpdate(instance, options) {
      if (!(instance instanceof AuditModel)) return;
      stampUpdate(instance);
      if (options.fields) {
        options.fields = options.fields.filter(
          (field) => !creationFields.includes(field),
        );
      }
      addFields(options, updateFields);
    },
    beforeBulkCreate(instances, options) {
      const audited = instances.filter(
        (instance) => instance instanceof AuditModel,
      );
      if (!audited.length) return;
      audited.forEach(stampCreation);
      addFields(options, [...creationFields, ...updateFields]);
      if (options.updateOnDuplicate) {
        options.updateOnDuplicate = [
          ...new Set([
            ...options.updateOnDuplicate.filter(
              (field) => !creationFields.includes(field),
            ),
            ...updateFields,
          ]),
        ];
      }
    },
    beforeBulkUpdate(options) {
      // Sequelize v6 passes these runtime properties but omits them from its type.
      const runtime = options as typeof options & {
        model?: unknown;
        attributes?: Record<string, unknown>;
      };
      if (!isAuditedModel(runtime.model) || !runtime.attributes) return;
      for (const field of creationFields) delete runtime.attributes[field];
      runtime.attributes.updatedBy = getAuditActorId();
      runtime.attributes.updatedAt = new Date();
      if (runtime.fields) {
        runtime.fields = runtime.fields.filter(
          (field) => !creationFields.includes(field),
        );
      }
      addFields(runtime, updateFields);
    },
    beforeUpsert(_values, options) {
      if (
        isAuditedModel((options as typeof options & { model?: unknown }).model)
      ) {
        // v6 builds INSERT/UPDATE values before this hook: mutating them here
        // cannot safely preserve creation attribution on conflict.
        throw new Error(
          'Audited models must use create/update or bulkCreate with updateOnDuplicate instead of upsert',
        );
      }
    },
  };
}
