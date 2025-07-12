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
        nombre_usuario: `${ap.user.name} ${ap.user.lastName} ${ap.user.secondLastName}`,
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


    const commandBase = `lockers/${payload.serial_number}/command`
    const topics = [
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

}
