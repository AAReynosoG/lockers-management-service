import type { HttpContext } from '@adonisjs/core/http'
import Locker from '#models/locker'
import Compartment from '#models/compartment'
import { sendErrorResponse, sendSuccessResponse } from '../helpers/response.js'
import LockerUserRole from '#models/locker_user_role'
import { assignUserToCompartment } from '#validators/compartment'
import User from '#models/user'
import { ResendService } from '#services/resend_service'
import AccessPermission from '#models/access_permission'
import AccessPermissionCompartment from '#models/access_permission_compartment'
import Organization from '#models/organization'
import {
  assignUserToCompartmentParamsValidator, getAuthUserLockers,
  getUsersWithLockersParamsValidator,
  lockerParamsValidator,
} from '#validators/locker'
import Schedule from '#models/schedule'

export default class LockersController {
  async getLockerCompartments({request, passportUser, response}: HttpContext) {
    const page = Number(request.input('page', 1))
    const limit = Number(request.input('limit', 10))
    const params = await lockerParamsValidator.validate(request.params())
    const lockerId = params.lockerId

    const locker = await Locker
      .query()
      .where('id', lockerId)
      .whereHas('lockerUserRoles', (query) => {
        query
          .where('user_id', passportUser.id)
          .whereIn('role', ['admin', 'super_admin'])
      })
      .preload('lockerUserRoles', (query) => {
        query.where('user_id', passportUser.id)
      })
      .first()

    if(!locker) {
      return sendErrorResponse(response, 403, `You do not have access to locker  ${lockerId}`)
    }

    const compartmentsQuery = await Compartment
      .query()
      .where('locker_id', lockerId)
      .orderBy('id', 'asc')
      .preload('accessPermissionCompartments', (query) => {
        query.preload('accessPermission', (apQuery) => {
          apQuery
            .preload('user')
            .preload('locker', (lockerQuery) => {
              lockerQuery.preload('lockerUserRoles')
            })
        })
      })
      .paginate(page, limit)

    const queryResults = compartmentsQuery.toJSON()

    const items = queryResults.data.map((comp) => {
      const usersMap = new Map<number, {
        id: number
        name: string
        last_name: string
        second_last_name: string
        email: string
        role: string
      }>()

      for (const apc of comp.accessPermissionCompartments) {
        const ap = apc.accessPermission
        const u = ap.user

        const lur = ap.locker.lockerUserRoles.find((l: LockerUserRole) => l.userId === u.id)

        usersMap.set(u.id, {
          id: u.id,
          name: u.name,
          last_name: u.lastName,
          second_last_name: u.secondLastName,
          email: u.email,
          role: lur?.role ?? 'user',
        })
      }

      return {
        id: comp.id,
        compartment_number: comp.compartmentNumber,
        status: comp.status,
        users: Array.from(usersMap.values()),
      }
    })

    return sendSuccessResponse(
      response,
      200,
      'Compartments retrieved successfully',
      {
        items: items,
        total: compartmentsQuery.total,
        page: page,
        limit: limit,
        has_next_page: compartmentsQuery.currentPage < compartmentsQuery.lastPage,
        has_previous_page: compartmentsQuery.currentPage > 1,
      }
    )
  }

  async getLockers({ request, passportUser, response }: HttpContext) {
    const page = Number(request.input('page', 1))
    const limit = Number(request.input('limit', 10))
    const organizationId = Number(request.input('organizationId'))
    const params = await getAuthUserLockers.validate(request.params())

    const lockersQuery = await Locker.query()
      .whereHas('lockerUserRoles', (lurQuery) => {
        lurQuery.where('user_id', passportUser.id)
      })
      .whereHas('area', (areaQuery) => {
        areaQuery.whereHas('organization', (orgQuery) => {
          if (organizationId) {
            orgQuery.where('id', organizationId)
          }
        })
      })
      .preload('area', (areaQuery) => {
        areaQuery.preload('organization')
      })
      .if(params.showSchedules, (query) => {
        query.preload('schedules')
      })
      .orderBy('id', 'asc')
      .paginate(page, limit)

    const queryResults = lockersQuery.toJSON()

    const items = queryResults.data.map((locker) => ({
      id: locker.id,
      locker_serial_number: locker.serialNumber,
      locker_number: locker.lockerNumber,
      area_id: locker.areaId,
      area_name: locker.area?.name,
      organization_id: locker.area?.organization?.id,
      organization_name: locker.area?.organization?.name,
      schedules: params.showSchedules ? locker.schedules.map((schedule: Schedule) => ({
        day_of_week: schedule.dayOfWeek,
        start_time: schedule.startTime,
        end_time: schedule.endTime,
        repeat_schedule: schedule.repeatSchedule,
        schedule_date: schedule.scheduleDate
      })) : [],
    }))

    return sendSuccessResponse(
      response,
      200,
      'Lockers retrieved successfully',
      {
        items: items,
        total: lockersQuery.total,
        page: page,
        limit: limit,
        has_next_page: lockersQuery.currentPage < lockersQuery.lastPage,
        has_previous_page: lockersQuery.currentPage > 1,
      }
    )
  }

  async assignUserToCompartment({request, response, passportUser}: HttpContext) {
    const payload = await request.validateUsing(assignUserToCompartment)
    const params = await assignUserToCompartmentParamsValidator.validate(request.params())
    const lockerId = params.lockerId
    const compartmentNumber = params.compartmentNumber

    const locker = await Locker.findBy('id', lockerId)

    if(!locker) {
      return sendErrorResponse(response, 404, `Locker doesn't found`)
    }

    const compartment = await Compartment.findBy({
      lockerId: locker.id,
      compartmentNumber: compartmentNumber,
    })

    if(!compartment) {
      return sendErrorResponse(response, 404, `Compartment doesn't exist`)
    }

    const user = await User.findBy('email', payload.user_email)

    if(!user) {
      await new ResendService().sendEmail(payload.user_email, 'Lockity - Invitation', 'invitation', { senderEmail: passportUser.email, guestEmail: payload.user_email})

      return sendErrorResponse(response, 404, `User doesn't exist. An invitation email has been sent to their email!`)
    }

    const actingRole = await LockerUserRole.findBy({
      lockerId: locker.id,
      userId: passportUser.id,
    })

    const isAdmin = actingRole && ['admin', 'super_admin'].includes(actingRole.role)

    if (!isAdmin) {
      return sendErrorResponse(response, 403, 'You must be an admin or super_admin in that Locker')
    }

    const targetRole = await LockerUserRole.firstOrCreate(
      { lockerId: locker.id, userId: user.id },
      { role: payload.role }
    )

    if (targetRole.$isPersisted && targetRole.role !== payload.role) {
      targetRole.role = payload.role
      await targetRole.save()
    }

    let accessPermission = await AccessPermission.firstOrCreate({
      lockerId: locker.id,
      userId: user.id,
    })

    await AccessPermissionCompartment.firstOrCreate({
      accessPermissionId: accessPermission.id,
      compartmentId: compartment.id,
    })

    return sendSuccessResponse(response, 201, 'Operation completed successfully')
  }

  async getUsersWithLockersByOrganization({request, response, passportUser}: HttpContext) {
    const page = Number(request.input('page', 1))
    const limit = Number(request.input('limit', 10))
    const role = request.input('role')

    const params = await getUsersWithLockersParamsValidator.validate(request.params())
    const organizationId = params.organizationId

    const org = await Organization.findBy('id', organizationId)

    if(!org) {
      return sendErrorResponse(response, 404, 'Organization not found')
    }

    const hasPermission = await LockerUserRole.query()
      .where('user_id', passportUser.id)
      .whereIn('role', ['admin', 'super_admin'])
      .whereHas('locker', (lockerQuery) => {
        lockerQuery.whereHas('area', (areaQuery) => {
          areaQuery.where('organization_id', organizationId)
        })
      })
      .first()

    if (!hasPermission) {
      return sendErrorResponse(response, 403, 'You must be admin or super_admin in the organization to view users')
    }

    const usersQuery = await User
      .query()
      .whereHas('lockerUserRoles', (lurQuery) => {
        lurQuery
          .if(role, (q) => {
            q.where('role', 'LIKE', `%${role}%`)
          })
          .whereHas('locker', (lockerQuery) => {
            lockerQuery.whereHas('area', (areaQuery) => {
              areaQuery.whereHas('organization', (orgQuery) => {
                orgQuery.where('id', organizationId)
              })
            })
          })
      })
      .orderBy('id', 'asc')
      .preload('lockerUserRoles', (lurQuery) => {
        lurQuery.preload('locker', (lockerQuery) => {
          lockerQuery.preload('area', (areaQuery) => {
            areaQuery.preload('organization')
          })
        })
      })
      .paginate(page, limit)

    const queryResults = usersQuery.toJSON()

    const items = queryResults.data.map((user) => ({
      id: user.id,
      name: user.name,
      last_name: user.lastName,
      second_last_name: user.secondLastName,
      email: user.email,
      assigned_lockers: user.lockerUserRoles.map((role: LockerUserRole) => ({
        serial_number: role.locker.serialNumber,
        role: role.role,
        organization: role.locker.area.organization.name,
        area: role.locker.area.name,
        locker_number: role.locker.lockerNumber
      }))
    }))

    return sendSuccessResponse(
      response,
      200,
      `Users${role ? ` with role ${role}` : ''} retrieved successfully`,
      {
        items: items,
        total: usersQuery.total,
        page: page,
        limit: limit,
        has_next_page: usersQuery.currentPage < usersQuery.lastPage,
        has_previous_page: usersQuery.currentPage > 1,
      }
    )
  }
}
