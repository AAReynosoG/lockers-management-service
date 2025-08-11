import type { HttpContext } from '@adonisjs/core/http'
import { createLockerValidator, updateLockerComponentValidator, addLockerComponentValidator } from '#validators/locker'
import Locker from '#models/locker'
import { sendErrorResponse, sendSuccessResponse } from '../helpers/response.js'
import Compartment from '#models/compartment'
import LockerTopic from '#models/locker_topic'
import LockerComponent from '#models/locker_component'
import LockerComponentsPin from '#models/locker_components_pin'

export default class LockersConfigsController {
  async getLockerConfig({ request, response }: HttpContext) {
    const serialNumnber = String(request.param('serialNumber'))

    const locker = await Locker
      .query()
      .where('serial_number', serialNumnber)
      .first()

    if(!locker) {
      return sendErrorResponse(response, 404, 'Locker not found')
    }

    const lockerWithRelations = await Locker
      .query()
      .where('id', locker.id)
      .preload('lockerTopics')
      .preload('accessPermissions', (apQuery) => {
        apQuery
          .preload('user', (userQuery) => {
            userQuery.preload('lockerUserRoles', (roleQuery) => {
              roleQuery.where('locker_id', locker.id)
            })
          })
          .preload('accessPermissionCompartments', (apcQuery) => {
          apcQuery.preload('compartment')
        })
      })
      .firstOrFail()

    const topicsObject: Record<string, string> = {}
    lockerWithRelations.lockerTopics.forEach((topic) => {
      const parts = topic.topic.split('/')
      const key = parts[parts.length - 1]
      topicsObject[key] = topic.topic
    })

    const components = await LockerComponent
      .query()
      .where('locker_id', locker.id)
      .preload('pins', (pinQuery) => {
        pinQuery.select(['id', 'component_id', 'pin_name', 'pin_number'])
      })
      .select(['id', 'type', 'model', 'status'])

    
    const users = lockerWithRelations.accessPermissions.map((ap) => {
      const compartments = ap.accessPermissionCompartments.map((apc) => {
        return apc.compartment.compartmentNumber.toString()
      })

      const userRoleForThisLocker = ap.user.lockerUserRoles.find(
        role => role.lockerId === locker.id
      )

      return {
        id_usuario: ap.userId.toString(),
        nombre_usuario: `${ap.user.name}`,
        cajones_usuario: [...new Set(compartments)],
        rol: userRoleForThisLocker?.role || null
      }
    })

    return response.status(200).send({
      initial_config: {
        id_locker: locker.id.toString(),
        topics: topicsObject,
        users: users,
        components: components
      }
    })
  }

  async createLocker({request, response} : HttpContext) {
    const payload = await request.validateUsing(createLockerValidator)

    let locker = await Locker.findBy('serial_number', payload.serial_number)

    if(locker) return sendErrorResponse(response, 409, 'Locker already exists')

    locker = await Locker.create({
      serialNumber: payload.serial_number
    })

    const components = [
      {
        lockerId: locker.id,
        type: 'display',
        model: 'DISPLAY-1',
        status: "active" as "active",
        pins: [
          { pinName: 'SCL', pinNumber: 22 },
          { pinName: 'SDA', pinNumber: 21 },
        ]
      },
      
      {
        lockerId: locker.id,
        type: 'clock',
        model: 'CLOCK-1',
        status: "active" as "active",        
        pins: [
          { pinName: 'CLK', pinNumber: 18 },
          { pinName: 'DAT', pinNumber: 23 },
          { pinName: 'RSY', pinNumber: 19 },
        ]
      },
      {
        lockerId: locker.id,
        type: 'buzzer',
        model: 'BUZZER-1',
        status: "active" as "active",        
        pins: [
          { pinName: 'signal', pinNumber: 21 },
        ]
      },
      {
        lockerId: locker.id,
        type: 'servo',
        model: 'SERVO-1',
        status: "active" as "active",        
        pins: [
          { pinName: 'signal', pinNumber: 13 },
        ]
      },
      {
        lockerId: locker.id,
        type: 'servo',
        model: 'SERVO-2',
        status: "active" as "active",        
        pins: [
          { pinName: 'signal', pinNumber: 14 },
        ]
      },
      {
        lockerId: locker.id,
        type: 'servo',
        model: 'SERVO-3',
        status: "active" as "active",        
        pins: [
          { pinName: 'signal', pinNumber: 12 },
        ]
      },

      {
        lockerId: locker.id,
        type: 'led',
        model: 'LED-1',
        status: "active" as "active",        
        pins: [
          { pinName: 'color', pinNumber: 26 },
        ]
      },
      {
        lockerId: locker.id,
        type: 'led',
        model: 'LED-2',
        status: "active" as "active",        
        pins: [
          { pinName: 'color', pinNumber: 25 },
        ]
      },
      {
        lockerId: locker.id,
        type: 'led',
        model: 'LED-3',
        status: "active" as "active",        
        pins: [
          { pinName: 'color', pinNumber: 32 },
        ]
      },
      {
        lockerId: locker.id,
        type: 'fingerprint',
        model: 'FINGERPRINT-1',
        status: "active" as "active",        
        pins: [
          { pinName: 'Tx', pinNumber: 16 },
          { pinName: 'Rx', pinNumber: 17 },
        ]
      }
    ]

    const commandBase = `${locker.serialNumber}/command`
    const topics = [
      `${locker.serialNumber}/action/change`,
      `${commandBase}/config`,
      `${commandBase}/toggle`,
      `${commandBase}/fingerprint`,
      `${commandBase}/alarm`,
      `${commandBase}/picture`,
      `${commandBase}/change`,
      `${commandBase}/picture/get`
    ]

    await Promise.all(
      topics.map(topic => 
        LockerTopic.create({
          lockerId: locker.id,
          topic: topic
        })
      )
    )

    await Promise.all(
      components.map(async (component) => {
        const createdComponent = await LockerComponent.create({
          lockerId: component.lockerId,
          type: component.type,
          model: component.model,
          status: component.status
        })

        await Promise.all(
          component.pins.map(pin => 
            LockerComponentsPin.create({
              componentId: createdComponent.id,
              pinName: pin.pinName,
              pinNumber: pin.pinNumber
            })
          )
        )
      })
    )

    await Promise.all(
      Array.from({ length: payload.number_of_compartments }, (_, index) =>
        Compartment.create({
          lockerId: locker.id,
          compartmentNumber: index + 1,
        })
      )
    )

    return sendSuccessResponse(response, 201, 'Locker created successfully.')
  }

  async getLockerSchedules({ request, response }: HttpContext) { 
    const serialNumber = String(request.param('serialNumber'))

    const locker = await Locker.query()
      .where('serial_number', serialNumber)
      .preload('schedules')
      .first()

    if (!locker) return sendErrorResponse(response, 404, 'Locker not found')

    const schedules = locker.schedules.map(schedule => ({
      id: schedule.id,
      day_of_week: schedule.dayOfWeek,
      start_time: schedule.startTime,
      end_time: schedule.endTime,
      repeat_schedule: schedule.repeatSchedule,
      schedule_date: schedule.scheduleDate
    }))

    return sendSuccessResponse(
      response, 
      200,
      'Schedules retrieved successfully.',
      { 
        locker_id: locker.id,
        schedules: schedules
      }
    )
  }

  async updateCompartmentStatus({request, response}: HttpContext) {
    const serialNumber = String(request.param('serialNumber'))
    const status = String(request.param('status'))
    const compartmentNumber = Number(request.param('compartmentNumber'))

    const locker = await Locker.query()
      .where('serial_number', serialNumber)
      .preload('accessPermissions', (apQuery) => {
        apQuery.preload('user', (userQuery) => {
          userQuery.preload('deviceTokens')
        })
      })
      .first()

    if(!locker) return sendErrorResponse(response, 404, 'Locker not found')

    const compartment = await Compartment.query()
      .where('locker_id', locker.id)
      .andWhere('compartment_number', compartmentNumber)
      .first()

    if(!compartment) return sendErrorResponse(response, 404, 'Compartment not found')

    const allowedStatuses = ['open', 'closed', 'error', 'maintenance'] as const
    if (!allowedStatuses.includes(status as any)) {
      return sendErrorResponse(response, 400, 'Invalid compartment status')
    }

    if (status != 'error') {
      compartment.status = status as typeof allowedStatuses[number]
      await compartment.save()
    }
    
    return sendSuccessResponse(response, 200, 'Compartment status updated successfully.')
  }

  async updateLockerComponent({ request, response }: HttpContext) {
    const payload = await request.validateUsing(updateLockerComponentValidator)

    const locker = await Locker.query()
      .where('serial_number', payload.serial_number)
      .first()

    if (!locker) {
      return sendErrorResponse(response, 404, 'Locker not found')
    }

    const oldComponent = await LockerComponent.query()
      .where('id', payload.old_component_id)
      .andWhere('locker_id', locker.id)
      .first()

    if (!oldComponent) {
      return sendErrorResponse(response, 404, 'Component not found')
    }

    try {
      const newPinNumbers = payload.new_component.pins.map(pin => pin.pin_number)
      
      const existingPins = await LockerComponentsPin.query()
        .whereIn('component_id', function (query) {
          query.select('id')
            .from('locker_components')
            .where('locker_id', locker.id)
            .where('status', 'active')
            .whereNot('id', payload.old_component_id)
        })
        .whereIn('pin_number', newPinNumbers)

      if (existingPins.length > 0) {
        const duplicatedPins = existingPins.map(pin => pin.pinNumber)
        return sendErrorResponse(
          response, 
          400, 
          `Pin numbers already in use by other active components: ${duplicatedPins.join(', ')}`
        )
      }

      oldComponent.status = payload.old_component_status
      await oldComponent.save()

      const newComponent = await LockerComponent.create({
        lockerId: locker.id,
        type: payload.new_component.type,
        model: payload.new_component.model,
        status: 'active'
      })

      await Promise.all(
        payload.new_component.pins.map(pin => 
          LockerComponentsPin.create({
            componentId: newComponent.id,
            pinName: pin.pin_name,
            pinNumber: pin.pin_number
          })
        )
      )

      return sendSuccessResponse(response, 200, 'Component updated successfully', {
        old_component: {
          id: oldComponent.id,
          status: oldComponent.status
        },
        new_component: {
          id: newComponent.id,
          type: newComponent.type,
          model: newComponent.model,
          status: newComponent.status
        }
      })

    } catch (error) {
      return sendErrorResponse(response, 500, 'Error updating component')
    }
  }

  async getLockerComponents({ request, response }: HttpContext) {
    const serialNumber = String(request.param('serialNumber'))
    const status = String(request.param('status'))

    const allowedStatuses = ['active', 'inactive', 'replaced'] as const
    if (!allowedStatuses.includes(status as any)) {
      return sendErrorResponse(response, 400, 'Invalid status. Allowed values: active, inactive, replaced')
    }

    const locker = await Locker.query()
      .where('serial_number', serialNumber)
      .first()

    if (!locker) {
      return sendErrorResponse(response, 404, 'Locker not found')
    }

    try {
      let components

      if (status === 'active') {
        components = await LockerComponent.query()
          .where('locker_id', locker.id)
          .andWhere('status', 'active')
          .preload('pins', (pinQuery) => {
            pinQuery.select(['id', 'component_id', 'pin_name', 'pin_number'])
          })
          .select(['id', 'type', 'model', 'status', 'created_at', 'updated_at'])
      } else {
        components = await LockerComponent.query()
          .where('locker_id', locker.id)
          .andWhereIn('status', ['inactive', 'replaced'])
          .preload('pins', (pinQuery) => {
            pinQuery.select(['id', 'component_id', 'pin_name', 'pin_number'])
          })
          .select(['id', 'type', 'model', 'status', 'created_at', 'updated_at'])
      }

      return sendSuccessResponse(response, 200, `${status} components retrieved successfully`, {
        locker_id: locker.id,
        serial_number: locker.serialNumber,
        status_filter: status,
        components_count: components.length,
        components: components.map(component => ({
          id: component.id,
          type: component.type,
          model: component.model,
          status: component.status,
          pins: component.pins.map(pin => ({
            id: pin.id,
            component_id: pin.componentId,
            pin_name: pin.pinName,
            pin_number: pin.pinNumber
          }))
        }))
      })

    } catch (error) {
      return sendErrorResponse(response, 500, 'Error retrieving components')
    }
  }

  async addLockerComponent({ request, response }: HttpContext) {
    const payload = await request.validateUsing(addLockerComponentValidator)

    const locker = await Locker.query()
      .where('serial_number', payload.serial_number)
      .first()

    if (!locker) {
      return sendErrorResponse(response, 404, 'Locker not found')
    }

    const restrictedTypes = ['fingerprint', 'clock', 'display']
    if (restrictedTypes.includes(payload.component.type.toLowerCase())) {
      return sendErrorResponse(
        response, 
        400, 
        `Cannot add ${payload.component.type} components due to analog pin limitations on ESP32`
      )
    }

    try {
      const newPinNumbers = payload.component.pins.map(pin => pin.pin_number)
      
      const existingPins = await LockerComponentsPin.query()
        .whereIn('component_id', function (query) {
          query.select('id')
            .from('locker_components')
            .where('locker_id', locker.id)
            .where('status', 'active')
        })
        .whereIn('pin_number', newPinNumbers)

      if (existingPins.length > 0) {
        const duplicatedPins = existingPins.map(pin => pin.pinNumber)
        return sendErrorResponse(
          response, 
          400, 
          `Pin numbers already in use by active components: ${duplicatedPins.join(', ')}`
        )
      }

      const newComponent = await LockerComponent.create({
        lockerId: locker.id,
        type: payload.component.type,
        model: payload.component.model,
        status: 'active'
      })

      await Promise.all(
        payload.component.pins.map(pin => 
          LockerComponentsPin.create({
            componentId: newComponent.id,
            pinName: pin.pin_name,
            pinNumber: pin.pin_number
          })
        )
      )

      await newComponent.load('pins')

      return sendSuccessResponse(response, 201, 'Component added successfully', {
        component: {
          id: newComponent.id,
          type: newComponent.type,
          model: newComponent.model,
          status: newComponent.status,
          pins: newComponent.pins.map(pin => ({
            id: pin.id,
            pin_name: pin.pinName,
            pin_number: pin.pinNumber
          }))
        }
      })

    } catch (error) {
      return sendErrorResponse(response, 500, 'Error adding component')
    }
  }
}
