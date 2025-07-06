import { DateTime } from 'luxon'
import { BaseModel, belongsTo, column, hasMany } from '@adonisjs/lucid/orm'
import Organization from '#models/organization'
import type { BelongsTo, HasMany } from '@adonisjs/lucid/types/relations'
import Locker from '#models/locker'

export default class Area extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare name: string

  @column()
  declare description: string

  @column({columnName: 'organization_id'})
  declare organizationId: number

  @belongsTo(() => Organization, {
    foreignKey: 'organizationId',
  })
  declare organization: BelongsTo<typeof Organization>

  @hasMany(() => Locker)
  declare lockers: HasMany<typeof Locker>

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime
}
