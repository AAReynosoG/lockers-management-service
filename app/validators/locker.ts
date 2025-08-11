import vine from '@vinejs/vine'
import { baseScheduleSchema } from '#validators/schedule'

export const createLockerValidator = vine.compile(
  vine.object({
    serial_number: vine.string().trim().maxLength(100),
    number_of_compartments: vine.number().positive().max(3).min(3),
  })
)


export const moveLockerToAreaValidator = vine.compile(
  vine.object({
    organization_id: vine.number().positive(),
    area_id: vine.number().positive(),
    serial_number: vine.string().trim().minLength(1).maxLength(100),
    new_schedule: vine.array(baseScheduleSchema).optional(),
  })
)

export const updateLockerComponentValidator = vine.compile(
  vine.object({
    serial_number: vine.string().trim().maxLength(100),
    old_component_id: vine.number().positive(),
    old_component_status: vine.enum(['replaced', 'inactive']),
    new_component: vine.object({
      type: vine.enum(['led', 'clock', 'display', 'buzzer', 'servo', 'fingerprint']),
      model: vine.string().trim().maxLength(100),
      pins: vine.array(
        vine.object({
          pin_name: vine.string().trim().maxLength(100),
          pin_number: vine.number().positive().max(255)
        })
      ).minLength(1)
    })
  })
)

export const addLockerComponentValidator = vine.compile(
  vine.object({
    serial_number: vine.string().trim().maxLength(100),
    component: vine.object({
      type: vine.enum(['led', 'servo', 'buzzer']),
      model: vine.string().trim().maxLength(100),
      pins: vine.array(
        vine.object({
          pin_name: vine.string().trim().maxLength(100),
          pin_number: vine.number().positive().max(255)
        })
      ).minLength(1)
    })
  })
)