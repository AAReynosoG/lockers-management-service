import type { HttpContext } from '@adonisjs/core/http'
import { createLockerValidator } from '#validators/locker'
import Locker from '#models/locker'
import { sendErrorResponse, sendSuccessResponse } from '../helpers/response.js'
import Compartment from '#models/compartment'
import LockerTopic from '#models/locker_topic'

export default class LockersConfigsController {
  async getLockerConfig({ request, response }: HttpContext) {
    const serialNumnber = String(request.param('serialNumber'))

    const locker = await Locker
      .query()
      .where('serial_number', serialNumnber)
      .preload('lockerTopics')
      .preload('accessPermissions', (apQuery) => {
        apQuery
          .preload('user')
          .preload('accessPermissionCompartments', (apcQuery) => {
          apcQuery.preload('compartment')
        })
      })
      .first()

    if(!locker) {
      return sendErrorResponse(response, 404, 'Locker not found')
    }

    const topicsObject: Record<string, string> = {}
    locker.lockerTopics.forEach((topic) => {
      const parts = topic.topic.split('/')
      const key = parts[parts.length - 1]
      topicsObject[key] = topic.topic
    })

    const users = locker.accessPermissions.map((ap) => {
      const compartments = ap.accessPermissionCompartments.map((apc) => {
        return apc.compartment.compartmentNumber.toString()
      })

      return {
        id_usuario: ap.userId.toString(),
        nombre_usuario: `${ap.user.name} ${ap.user.lastName}`,
        cajones_usuario: [...new Set(compartments)]
      }
    })

    return response.status(200).send({
      initial_config: {
        id_locker: locker.id.toString(),
        topics: topicsObject,
        users: users
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


    const commandBase = `/${locker.serialNumber}/command`
    const topics = [
      `${locker.serialNumber}/action/change`,
      `${commandBase}/config`,
      `${commandBase}/toggle`,
      `${commandBase}/fingerprint`,
      `${commandBase}/alarm`,
      `${commandBase}/picture`,
      `${commandBase}/change`
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

    const locker = await Locker.findBy('serial_number', serialNumber)
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

    compartment.status = status as typeof allowedStatuses[number]
    await compartment.save()
    return sendSuccessResponse(response, 200, 'Compartment status updated successfully.')
  }
}
