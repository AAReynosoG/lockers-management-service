import vine from '@vinejs/vine'

export const baseScheduleSchema = vine.object({
  day_of_week: vine.enum(['mon','tue','wed','thu','fri','sat','sun']).nullable(),
  start_time: vine.string().trim().maxLength(8).minLength(8),
  end_time: vine.string().trim().maxLength(8).minLength(8),
  repeat_schedule: vine.boolean(),
  schedule_date: vine.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
})

export const createScheduleValidator = vine.compile(baseScheduleSchema)

export const updateScheduleValidator = vine.compile(
  vine.object({
    day_of_week: vine.enum(['mon','tue','wed','thu','fri','sat','sun']).nullable(),
    start_time: vine.string().trim().maxLength(8).minLength(8).optional(),
    end_time: vine.string().trim().maxLength(8).minLength(8).optional(),
    repeat_schedule: vine.boolean().optional(),
    schedule_date: vine.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
  })
)

export const updateScheduleParamsValidator = vine.compile(
  vine.object({
    lockerId: vine.number().positive(),
    scheduleId: vine.number().positive(),
  })
)


