import DeviceToken from '#models/device_token'
import { deviceTokenValidator } from '#validators/device_token'
import type { HttpContext } from '@adonisjs/core/http'
import { sendErrorResponse, sendSuccessResponse } from '../helpers/response.js'
import { BackgroundNotificationService } from '#services/background_notification_service'
import Locker from '#models/locker'
import { SlackService } from '#services/slack_service'

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

    async sendStillOpenAlert({ request, response }: HttpContext) {
        const serialNumber = request.param('serialNumber')
        const compartmentNumber = Number(request.param('compartmentNumber'))

        const locker = await Locker.query()
            .where('serial_number', serialNumber)
            .preload('accessPermissions', (apQuery) => {
                apQuery
                    .preload('user', (userQuery) => {
                        userQuery.preload('deviceTokens')
                    })
                    .preload('accessPermissionCompartments', (apcQuery) => {
                        apcQuery.preload('compartment')
                    })
            })
            .first()

        if (!locker) {
            return sendErrorResponse(response, 404, 'Locker not found')
        }

        try {
            const usersWithCompartmentAccess: string[] = []
            
            locker.accessPermissions.forEach(permission => {
                const hasCompartmentAccess = permission.accessPermissionCompartments.some(
                    apc => apc.compartment.compartmentNumber === compartmentNumber
                )
                
                if (hasCompartmentAccess) {
                    permission.user.deviceTokens.forEach(deviceToken => {
                        usersWithCompartmentAccess.push(deviceToken.deviceToken)
                    })
                }
            })

            if (usersWithCompartmentAccess.length === 0) {
                return sendSuccessResponse(response, 200, 'No users with compartment access found')
            }

            const notificationService = new BackgroundNotificationService()

            const title = '🚨 Compartment Still Open'
            const body = `Compartment ${compartmentNumber} of locker ${serialNumber} has been open for 5 minutes. Please close it to secure your belongings.`
            

            const result = await notificationService.sendToMultipleDevices(
                usersWithCompartmentAccess,
                title,
                body,
            )

            return sendSuccessResponse(response, 200, 'Compartment open alert sent successfully', {
                locker_serial: serialNumber,
                compartment_number: compartmentNumber,
                notifications_sent: result?.successCount || 0,
                notifications_failed: result?.failureCount || 0,
                users_notified: usersWithCompartmentAccess.length
            })

        } catch (error) {
            await new SlackService().sendExceptionMessage(error, 500)
            return sendErrorResponse(response, 500, 'Error sending compartment open alert')
        }
    }

    
}