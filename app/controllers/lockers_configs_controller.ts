import type { HttpContext } from '@adonisjs/core/http'
import { createLockerTopicsValidator, getLockerConfigParamsValidator } from '#validators/locker'
import Locker from '#models/locker'
import { sendErrorResponse, sendSuccessResponse } from '../helpers/response.js'
import LockerTopic from '#models/locker_topic'

export default class LockersConfigsController {
  async getLockerConfig({ request, response }: HttpContext) {
    const { lockerId } = await getLockerConfigParamsValidator.validate(request.params())

    const locker = await Locker
      .query()
      .where('id', lockerId)
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

  async createLockerTopics({ request, response}: HttpContext) {
    const { lockerId } = await getLockerConfigParamsValidator.validate(request.params())
    const payload = await request.validateUsing(createLockerTopicsValidator)

    await LockerTopic.create({
      lockerId: lockerId,
      topic: payload.topic
    })

    return sendSuccessResponse(response, 201, 'Topic created successfully.')
  }

}
