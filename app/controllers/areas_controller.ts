import Organization from '#models/organization'
import { createAreaValidator } from '#validators/area'
import type { HttpContext } from '@adonisjs/core/http'
import { sendErrorResponse, sendSuccessResponse } from '../helpers/response.js'
import Area from '#models/area'

export default class AreasController {
    async createArea({ request, response, passportUser}: HttpContext) {
        const organizationId = Number(request.param('organizationId'))
        const payload = await request.validateUsing(createAreaValidator)

        const org = await Organization.query().where('id', organizationId)
            .andWhere('created_by', passportUser.id).first()
        if (!org) return sendErrorResponse(response, 404, 'Organization not found or you are not the owner.')

        const existingArea = await Area.query().where('organizationId', organizationId)
            .andWhere('name', payload.name).first()
        if (existingArea) return sendErrorResponse(response, 400, 'Area with this name already exists.')

        await Area.create({
            name: payload.name,
            description: payload.description,
            organizationId: organizationId
        })

        return sendSuccessResponse(response, 201, 'Area created successfully.')
    }
}