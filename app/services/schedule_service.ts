import Schedule from '#models/schedule'

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

    const throwError = (msg: string) => { throw new Error(msg) }

    if (repeat_schedule) {
      if (!hasDay) throwError('day_of_week is required when repeat_schedule is true')
      if (hasDate) throwError('schedule_date must be null when repeat_schedule is true')

      const exists = await Schedule.query()
        .where('locker_id', lockerId)
        .where('repeat_schedule', true)
        .where('day_of_week', day_of_week)
        .first()

      if (exists) throwError(`A weekly schedule already exists for '${day_of_week}'`)
    } else {
      if (!hasDate) throwError('schedule_date is required when repeat_schedule is false')
      if (hasDay) throwError('day_of_week must be null when schedule_date is defined')

      const exists = await Schedule.query()
        .where('locker_id', lockerId)
        .where('repeat_schedule', false)
        .where('schedule_date', schedule_date)
        .first()

      if (exists) throwError(`A schedule already exists for the date ${schedule_date}`)
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
}
