import Schedule from '#models/schedule'
import CustomException from '#exceptions/custom_exception'

export default class ScheduleService {
  public static async validateAndCreate(schedule: any, lockerId: number, userId: number) {
    const {
      day_of_week,
      start_time,
      end_time,
      repeat_schedule,
      schedule_date
    } = schedule

    const hasDay = !!day_of_week
    const hasDate = !!schedule_date

    const throwError = (msg: string, statusCode: number) => { throw new CustomException(msg, statusCode) }

    if (repeat_schedule) {
      if (!hasDay) throwError('day_of_week is required when repeat_schedule is true', 409)
      if (hasDate) throwError('schedule_date must be null when repeat_schedule is true', 409)

      const exists = await Schedule.query()
        .where('locker_id', lockerId)
        .where('repeat_schedule', true)
        .where('day_of_week', day_of_week)
        .first()

      if (exists) throwError(`A weekly schedule already exists for '${day_of_week}'`, 409)
    } else {
      if (!hasDate) throwError('schedule_date is required when repeat_schedule is false', 409)
      if (hasDay) throwError('day_of_week must be null when schedule_date is defined', 409)

      const exists = await Schedule.query()
        .where('locker_id', lockerId)
        .where('repeat_schedule', false)
        .where('schedule_date', schedule_date)
        .first()

      if (exists) throwError(`A schedule already exists for the date ${schedule_date}`, 409)
    }

    return await Schedule.create({
      lockerId,
      dayOfWeek: day_of_week,
      startTime: start_time,
      endTime: end_time,
      repeatSchedule: repeat_schedule,
      scheduleDate: schedule_date,
      createdBy: userId
    })
  }

  public static async validateAndUpdate(
    scheduleId: number,
    updates: Partial<{
      day_of_week: string | null
      start_time: string
      end_time: string
      repeat_schedule: boolean
      schedule_date: string | null
    }>,
    lockerId: number,
  ) {
    const {
      day_of_week,
      start_time,
      end_time,
      repeat_schedule,
      schedule_date
    } = updates

    const hasDay = day_of_week !== undefined && day_of_week !== null
    const hasDate = schedule_date !== undefined && schedule_date !== null

    const throwError = (msg: string, statusCode: number): never => { throw new CustomException(msg, statusCode) }

    const schedule = await Schedule.find(scheduleId)
    if (!schedule) throw new CustomException('Schedule not found', 404)

    if (schedule.lockerId !== lockerId) throwError('Schedule does not belong to the specified locker', 409)

    const repeat = repeat_schedule !== undefined ? repeat_schedule : schedule.repeatSchedule

    if (repeat) {
      if (!hasDay) throwError('day_of_week is required when repeat_schedule is true', 409)
      if (hasDate) throwError('schedule_date must be null when repeat_schedule is true', 409)

      const exists = await Schedule.query()
        .where('locker_id', lockerId)
        .where('repeat_schedule', true)
        .where('day_of_week', day_of_week!)
        .whereNot('id', scheduleId)
        .first()

      if (exists) throwError(`A weekly schedule already exists for '${day_of_week}'`, 409)
    } else {
      if (!hasDate) throwError('schedule_date is required when repeat_schedule is false', 409)
      if (hasDay) throwError('day_of_week must be null when schedule_date is defined', 409)

      const exists = await Schedule.query()
        .where('locker_id', lockerId)
        .where('repeat_schedule', false)
        .where('schedule_date', schedule_date!)
        .whereNot('id', scheduleId)
        .first()

      if (exists) throwError(`A schedule already exists for the date ${schedule_date}`, 409)
    }

    if (day_of_week !== undefined) schedule.dayOfWeek = day_of_week
    if (start_time !== undefined) schedule.startTime = start_time
    if (end_time !== undefined) schedule.endTime = end_time
    if (repeat_schedule !== undefined) schedule.repeatSchedule = repeat_schedule
    if (schedule_date !== undefined) schedule.scheduleDate = schedule_date

    await schedule.save()

    return schedule
  }

}
