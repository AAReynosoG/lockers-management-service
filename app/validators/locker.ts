import vine from '@vinejs/vine'

export const lockerParamsValidator = vine.compile(
  vine.object({
    lockerId: vine.number().positive(),
  })
)

export const assignUserToCompartmentParamsValidator = vine.compile(
  vine.object({
    lockerId: vine.number().positive(),
    compartmentNumber: vine.number().positive(),
  })
)

export const getUsersWithLockersParamsValidator = vine.compile(
  vine.object({
    organizationId: vine.number().positive(),
  })
)

export const lockerIdParamsValidator = vine.compile(
  vine.object({
    lockerId: vine.number().positive(),
  })
)

export const createLockerTopicsValidator = vine.compile(
  vine.object({
    topic: vine.string().trim(),
  })
)

export const createLockerValidator = vine.compile(
  vine.object({
    serial_number: vine.string().trim().maxLength(100),
    number_of_compartments: vine.number().positive().max(3).min(1),
  })
)

const scheduleSchema = vine.object({
  day_of_week: vine.enum(['mon','tue','wed','thu','fri','sat','sun']).nullable(),
  start_time: vine.string().trim().maxLength(8).minLength(8),
  end_time: vine.string().trim().maxLength(8).minLength(8),
  repeat_schedule: vine.boolean(),
  schedule_date: vine.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
})

export const moveLockerToAreaValidator = vine.compile(
  vine.object({
    organization_id: vine.number().positive(),
    area_id: vine.number().positive(),
    serial_number: vine.string().trim().minLength(1).maxLength(100),
    new_schedule: vine.array(scheduleSchema).optional(),
  })
)
