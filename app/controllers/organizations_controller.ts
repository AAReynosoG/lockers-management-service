import { HttpContext } from '@adonisjs/core/http'
import { createOrganization, updateOrganizationValidator } from '#validators/organization'
import Organization from '#models/organization'
import db from '@adonisjs/lucid/services/db'
import Area from '#models/area'
import Locker from '#models/locker'
import { sendErrorResponse, sendSuccessResponse } from '../helpers/response.js'
import AccessPermission from '#models/access_permission'
import LockerUserRole from '#models/locker_user_role'
import AccessPermissionCompartment from '#models/access_permission_compartment'
import Compartment from '#models/compartment'

export default class OrganizationsController {
  async createOrganizationAndArea({ request, response, passportUser }: HttpContext) {
    const payload = await request.validateUsing(createOrganization)

    const trx = await db.transaction()

    try {
      const existingOrg = await Organization
        .query({ client: trx })
        .where('name', payload.name)
        .first()

      if (existingOrg) {
        await trx.rollback()
        return sendErrorResponse(response, 409, `Organization ${existingOrg.name} already exists`)
      }

      const org = new Organization()
      org.name = payload.name
      org.description = payload.description
      org.createdById = passportUser.id
      org.useTransaction(trx)
      await org.save()

      const existingArea = await Area
        .query({ client: trx })
        .where('name', org.name)
        .where('organization_id', org.id)
        .first()

      if (existingArea) {
        await trx.rollback()
        return sendErrorResponse(response, 409, `Area ${org.name} already exists`)
      }

      const area = new Area()
      area.name = payload.area.name
      area.description = payload.area.description
      area.organizationId = org.id
      area.useTransaction(trx)
      await area.save()

      const locker = await Locker
        .query({ client: trx })
        .where('serial_number', payload.locker_serial_number)
        .forUpdate()
        .first()

      if (!locker) {
        await trx.rollback()
        return sendErrorResponse(response, 404, `Locker ${payload.locker_serial_number} not found`)
      }

      if (locker.areaId != null) {
        await trx.rollback()
        return sendErrorResponse(response, 409, `The locker with serial number ${locker.serialNumber} is already linked to an organization and area`)
      }

      const count = Number(
        (await Locker.query({ client: trx })
          .where('area_id', area.id)
          .count('* as total'))[0].$extras.total
      )

      locker.areaId = area.id
      locker.lockerNumber = count + 1
      locker.useTransaction(trx)
      await locker.save()

      await LockerUserRole.firstOrCreate({
        role: 'super_admin',
        userId: passportUser.id,
        lockerId: locker.id
      }, {}, { client: trx })

      const accessPermission = await AccessPermission.firstOrCreate({
        lockerId: locker.id,
        userId: passportUser.id,
      }, {}, { client: trx })

      const compartments = await Compartment
        .query({ client: trx })
        .where('locker_id', locker.id)

      for (const compartment of compartments) {
        await AccessPermissionCompartment.firstOrCreate({
          accessPermissionId: accessPermission.id,
          compartmentId: compartment.id,
        }, {}, { client: trx })
      }

      await trx.commit()

      return sendSuccessResponse(response, 201, 'Organization created successfully.')
    } catch (error) {
      await trx.rollback()
      throw error
    }
  }


  async getOrganizations({response, passportUser, request}: HttpContext) {
    const page = Number(request.input('page', 1))
    const limit = Number(request.input('limit', 10))

    const query = await Organization.query()
      .where('created_by', passportUser.id)
      .preload('areas')
      .orderBy('id', 'asc')
      .paginate(page, limit)

    const queryResults = query.toJSON()

    const items = queryResults.data.map((org) => ({
      id: org.id,
      created_by: org.createdById,
      name: org.name,
      description: org.description,
      areas: org.areas.map((area: Area) => ({
        id: area.id,
        name: area.name,
        description: area.description,
      })),
    }))

    return sendSuccessResponse(
      response,
      200,
      'Organizations retrieved successfully',
      {
        items: items,
        total: query.total,
        page: page,
        limit: limit,
        has_next_page: query.currentPage < query.lastPage,
        has_previous_page: query.currentPage > 1,
      }
      )
  }

  async updateOrganization({response, request}: HttpContext) {
    const organizationId = Number(request.param('organizationId'))
    const payload = await request.validateUsing(updateOrganizationValidator)

    const org = await Organization.find(organizationId)

    if(!org){
      return sendErrorResponse(response, 404, 'Organization not found')
    }

    if (payload.name) {
      const existingOrg = await Organization
      .query()
      .where('name', payload.name)
      .whereNot('id', organizationId)
      .first()

      if (existingOrg) return sendErrorResponse(response, 409, `Organization with name "${payload.name}" already exists`)
    }

    if(payload.name) org.name = payload.name

    if(payload.description) org.description = payload.description

    await org.save()

    return sendSuccessResponse(response, 200, 'Operation completed successfully')
  }
}
