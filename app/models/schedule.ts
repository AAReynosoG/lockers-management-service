import { DateTime } from 'luxon'
import { BaseModel, belongsTo, column } from '@adonisjs/lucid/orm'
import Locker from '#models/locker'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import User from '#models/user'

export default class Schedule extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column({columnName: 'locker_id'})
  declare lockerId: number

  @column({columnName: 'day_of_week'})
  declare dayOfWeek: string

  @column({columnName: 'start_time'})
  declare startTime: string

  @column({columnName: 'end_time'})
  declare endTime: string

  @column({columnName: 'repeat_schedule'})
  declare repeatSchedule: boolean

  @column({columnName: 'schedule_date'})
  declare scheduleDate: string

  @column({columnName: 'created_by'})
  declare createdBy: number

  @belongsTo(() => User, {
    foreignKey: 'createdBy',
  })
  declare creator: BelongsTo<typeof User>

  @belongsTo(() => Locker, {
    foreignKey: 'lockerId',
  })
  declare locker: BelongsTo<typeof Locker>

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime
}
