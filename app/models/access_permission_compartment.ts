import { DateTime } from 'luxon'
import { BaseModel, belongsTo, column } from '@adonisjs/lucid/orm'
import AccessPermission from '#models/access_permission'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import Compartment from '#models/compartment'

export default class AccessPermissionCompartment extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column({columnName: 'compartment_id'})
  declare compartmentId: number

  @column({ columnName: 'access_permission_id' })
  declare accessPermissionId: number

  @belongsTo(() => Compartment, {
    foreignKey: 'compartmentId',
  })
  declare compartment: BelongsTo<typeof Compartment>

  @belongsTo(() => AccessPermission, {
    foreignKey: 'accessPermissionId',
  })
  declare accessPermission: BelongsTo<typeof AccessPermission>;

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime
}
