import DeviceToken from '#models/device_token'
import { deviceTokenValidator } from '#validators/device_token'
import type { HttpContext } from '@adonisjs/core/http'
import { sendErrorResponse, sendSuccessResponse } from '../helpers/response.js'

export default class DevicesController {
    async storeDeviceToken({ request, response, passportUser }: HttpContext) {
        const payload = await request.validateUsing(deviceTokenValidator)

        const existingToken = await DeviceToken.query()
            .where('userId', passportUser.id)
            .where('deviceToken', payload.device_token)
            .first()

        if (existingToken) {
            return sendSuccessResponse(response, 409, 'Device token already registered')
        }

        if(!payload.device_type) { 
            return sendErrorResponse(response, 400, 'Device type is required')
        }

        await DeviceToken.create({
            userId: passportUser.id,
            deviceToken: payload.device_token,
            deviceType: payload.device_type,
            platform: 'linux'
        })

        return sendSuccessResponse(response, 201, 'Device token registered successfully')
    }

    async destroyDeviceToken({ request, response, passportUser }: HttpContext) {
        const payload = await request.validateUsing(deviceTokenValidator)

        const deviceToken = await DeviceToken.query()
            .where('userId', passportUser.id)
            .where('deviceToken', payload.device_token)
            .first()

        if (!deviceToken) {
            return sendSuccessResponse(response, 404, 'Device token not found')
        }

        await deviceToken.delete()

        return sendSuccessResponse(response, 200, 'Device token deleted successfully')
    }
}