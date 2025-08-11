import { DateTime } from 'luxon'
import { BaseModel, belongsTo, column } from '@adonisjs/lucid/orm'
import LockerComponent from '#models/locker_component'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'

export default class LockerComponentsPin extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column({ columnName: 'component_id' })
  declare componentId: number

  @column({ columnName: 'pin_name' })
  declare pinName: string

  @column({ columnName: 'pin_number' })
  declare pinNumber: number

  @belongsTo(() => LockerComponent, {
    foreignKey: 'componentId',
  })
  declare component: BelongsTo<typeof LockerComponent>

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime
}