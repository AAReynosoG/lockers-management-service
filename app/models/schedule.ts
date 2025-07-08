import { DateTime } from 'luxon'
import { BaseModel, belongsTo, column } from '@adonisjs/lucid/orm'
import Locker from '#models/locker'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'

export default class Schedule extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column({columnName: 'locker_id'})
  declare lockerId: number

  @column({columnName: 'day_of_week'})
  declare dayOfWeek: number

  @column({columnName: 'start_time'})
  declare startTime: string

  @column({columnName: 'end_time'})
  declare endTime: string

  @column({columnName: 'repeat_schedule'})
  declare repeatSchedule: boolean

  @column.date({columnName: 'schedule_date', serializeAs: 'scheduleDate'})
  declare scheduleDate: DateTime

  @belongsTo(() => Locker, {
    foreignKey: 'lockerId',
  })
  declare locker: BelongsTo<typeof Locker>

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime
}
