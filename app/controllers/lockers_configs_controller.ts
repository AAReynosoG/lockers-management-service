import type { HttpContext } from '@adonisjs/core/http'
import { createLockerValidator } from '#validators/locker'
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
          { pinName: 'signal', pinNumber: 18 },
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
          { pinName: 'color', pinNumber: 18 },
        ]
      },
      {
        lockerId: locker.id,
        type: 'led',
        model: 'LED-2',
        status: "active" as "active",        
        pins: [
          { pinName: 'color', pinNumber: 18 },
        ]
      },
      {
        lockerId: locker.id,
        type: 'led',
        model: 'LED-3',
        status: "active" as "active",        
        pins: [
          { pinName: 'color', pinNumber: 18 },
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
}
