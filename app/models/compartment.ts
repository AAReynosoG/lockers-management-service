import { DateTime } from 'luxon'
import { BaseModel, belongsTo, column, hasMany } from '@adonisjs/lucid/orm'
import Locker from '#models/locker'
import type { BelongsTo, HasMany } from '@adonisjs/lucid/types/relations'
import AccessPermissionCompartment from '#models/access_permission_compartment'

export default class Compartment extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare compartmentNumber: number;

  @column()
  declare status: 'open' | 'closed' | 'error' | 'maintenance'

  @column({columnName: 'locker_id'})
  declare lockerId: number

  @belongsTo(() => Locker, {
    foreignKey: 'lockerId'
  })
  declare locker: BelongsTo<typeof Locker>;

  @hasMany(() => AccessPermissionCompartment)
  declare accessPermissionCompartments: HasMany<typeof AccessPermissionCompartment>

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime
}
