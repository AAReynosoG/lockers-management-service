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
  moveLockerToAreaValidator,
} from '#validators/locker'
import Schedule from '#models/schedule'
import Area from '#models/area'
import ScheduleService from '#services/schedule_service'
import { IsAdminService } from '#services/is_admin_service'
import { validatePagination } from '../helpers/validate_query_params.js'
import { isInteger } from '@sindresorhus/is'
import { LockerNumberingService } from '#services/locker_numbering_service'

export default class LockersController {
  async getLockerCompartments(ctx: HttpContext) {
    const { request, response, passportUser } = ctx
    const pagination = await validatePagination(ctx)
    if (!pagination) return

    const { page, limit } = pagination
    const lockerId = Number(request.param('lockerId'))

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

  async getLockers(ctx: HttpContext) {
    const { request, response, passportUser } = ctx
    const pagination = await validatePagination(ctx)
    if (!pagination) return

    const { page, limit } = pagination
    const organizationId = Number(request.input('organizationId'))
    const showSchedules = request.input('showSchedules', 'false') === 'true'

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
      .if(showSchedules, (query) => {
        query.preload('schedules')
      })
      .orderBy('id', 'asc')
      .paginate(page, limit)

    const queryResults = lockersQuery.toJSON()

    const items = queryResults.data.map((locker) => ({
      locker_id: locker.id,
      locker_serial_number: locker.serialNumber,
      locker_number: locker.lockerNumber,
      area_id: locker.areaId,
      area_name: locker.area?.name,
      organization_id: locker.area?.organization?.id,
      organization_name: locker.area?.organization?.name,
      schedules: showSchedules ? locker.schedules.map((schedule: Schedule) => ({
        schedule_id: schedule.id,
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
    const lockerId = Number(request.param('lockerId'))
    const compartmentNumber = Number(request.param('compartmentNumber'))

    const locker = await Locker
    .query()
    .where('id', lockerId)
    .preload('area', (areaQuery) => {
      areaQuery.preload('organization')
    })
    .first()

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

    const isAdmin = await IsAdminService.isAdmin(lockerId, passportUser.id, ['admin', 'super_admin'])
    if (!isAdmin) return sendErrorResponse(response, 403, 'You must be admin or super_admin in the locker to assign users to compartments')
    
    if (payload.role === 'admin') {
      const isSuperAdmin = await IsAdminService.isAdmin(lockerId, passportUser.id, ['super_admin'])
      if (!isSuperAdmin) return sendErrorResponse(response, 403, 'You must be super_admin in the locker to assign admin role')
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

    const existingCompartmentAccess = await AccessPermissionCompartment
      .query()
      .where('access_permission_id', accessPermission.id)
      .where('compartment_id', compartment.id)
      .first()

    const wasAlreadyAssigned = !!existingCompartmentAccess

    if (!wasAlreadyAssigned) {
      await AccessPermissionCompartment.firstOrCreate({
        accessPermissionId: accessPermission.id,
        compartmentId: compartment.id,
      })
    }

    if (!wasAlreadyAssigned) {
    const org = locker.area?.organization?.name || 'Unknown Organization' 

    await new ResendService().sendEmail(user.email, 
      `Lockity - ${passportUser.name + ' ' + passportUser.lastName} (${passportUser.email}) granted you access to compartment of a Locker`, 
      'linking_notification',
    {
      username: passportUser.name + ' ' + passportUser.lastName,
      compartmentNumber: compartmentNumber,
      organization: org,
      lockerNumber: locker.lockerNumber,
      area: locker.area?.name || 'Unknown Area',
      role: payload.role,
    })
  }

    return sendSuccessResponse(response, 201, 'Operation completed successfully')
  }

  async getUsersWithLockersByOrganization(ctx: HttpContext) {
    const { request, response, passportUser } = ctx
    const pagination = await validatePagination(ctx)
    if (!pagination) return

    const { page, limit } = pagination
    const role = request.input('role')
    const organizationId = Number(request.param('organizationId'))

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
          lockerQuery.preload('lockerCompartments')
          lockerQuery.preload('area', (areaQuery) => {
            areaQuery.preload('organization')
          })
        })
      })
      .paginate(page, limit)

    const queryResults = usersQuery.toJSON()

    const items = await Promise.all(queryResults.data.map(async (user) => {
      const assigned_lockers = await Promise.all(user.lockerUserRoles.map(async (role: LockerUserRole) => {
        const userCompartments = await Compartment.query()
          .where('locker_id', role.locker.id)
          .whereHas('accessPermissionCompartments', (apcQuery) => {
            apcQuery.whereHas('accessPermission', (apQuery) => {
              apQuery.where('user_id', user.id)
              apQuery.where('locker_id', role.locker.id)
            })
          })
          .select('id', 'compartment_number')

        return {
          locker_id: role.locker.id,
          serial_number: role.locker.serialNumber,
          role: role.role,
          organization: role.locker.area.organization.name,
          area: role.locker.area.name,
          locker_number: role.locker.lockerNumber,
          compartments: userCompartments.map(compartment => ({
            compartment_id: compartment.id,
            compartment_number: compartment.compartmentNumber,
          }))
        }
      }))

      return {
        id: user.id,
        name: user.name,
        last_name: user.lastName,
        second_last_name: user.secondLastName,
        email: user.email,
        assigned_lockers: assigned_lockers
      }
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

  async moveLockerToArea({ request, response, passportUser }: HttpContext) {
    const payload = await request.validateUsing(moveLockerToAreaValidator)

    const organization = await Organization.query()
      .where('id', payload.organization_id)
      .where('created_by', passportUser.id)
      .first()

    if (!organization) return sendErrorResponse(response, 403, 'You must be the owner of this organization')

    const area = await Area.query()
      .where('id', payload.area_id)
      .where('organization_id', payload.organization_id)
      .first()

    if (!area) return sendErrorResponse(response, 404, 'The area does not belong to the given organization')

    let locker = await Locker.findBy('serial_number', payload.serial_number)

    if (!locker) return sendErrorResponse(response, 404, 'Locker not found')

    if (locker.areaId) {
      await locker.load('area')
      const originOrgId = locker.area?.organizationId

      if (originOrgId !== payload.organization_id) {
        const isOwnerOfOrigin = await Organization.query()
          .where('id', originOrgId)
          .where('created_by', passportUser.id)
          .first()

        if (!isOwnerOfOrigin) return sendErrorResponse(response, 403, 'You cannot move a locker from an organization you do not own')
      }
    }

    await LockerUserRole.firstOrCreate({
      role: 'super_admin',
      userId: passportUser.id,
      lockerId: locker.id
    })

    const accessPermission = await AccessPermission.firstOrCreate({
      lockerId: locker.id,
      userId: passportUser.id,
    })

    const compartments = await Compartment
      .query()
      .where('locker_id', locker.id)

    for (const compartment of compartments) {
      await AccessPermissionCompartment.firstOrCreate({
        accessPermissionId: accessPermission.id,
        compartmentId: compartment.id,
      })
    }
 
    const nextNumber = await LockerNumberingService.assignNextNumber(locker.id, payload.area_id)

    locker.areaId = payload.area_id
    locker.lockerNumber = nextNumber
    await locker.save()

    if (payload.new_schedule && Array.isArray(payload.new_schedule)) {
      for (const schedule of payload.new_schedule) {
        try {
          await ScheduleService.validateAndCreate(schedule, locker.id, passportUser.id)
        } catch (error) {
          return sendErrorResponse(response, error.statusCode, error.message)
        }
      }
    }

    return sendSuccessResponse(response, 200, 'Operation completed successfully')
  }

  async removeUserAccessToCompartment({ request, response, passportUser }: HttpContext) {
    const lockerId = Number(request.param('lockerId'))
    const userId = Number(request.param('userId'))
    const compartmentNumber = Number(request.input('compartmentNumber'))
    const deleteAllAccess = request.input('deleteAllAccess', 'false') === 'true'

    if(userId === passportUser.id) return sendErrorResponse(response, 400, 'You cannot remove your own access to a compartment budy!!!')

    const locker = await Locker.find(lockerId)
    if (!locker) return sendErrorResponse(response, 404, 'Locker not found')

    const isSuperAdmin = await IsAdminService.isAdmin(lockerId, passportUser.id, ['super_admin'])
    if (!isSuperAdmin) return sendErrorResponse(response, 403, 'You must be super_admin in the locker to remove user access')

    const accessPermission = await AccessPermission.query()
      .where('locker_id', lockerId)
      .where('user_id', userId)
      .first()

    if (!accessPermission) return sendErrorResponse(response, 404, 'Access permission not found for the user')

    const lockerUserRole = await LockerUserRole.query()
      .where('locker_id', lockerId)
      .where('user_id', userId)
      .first()

    if (!lockerUserRole) return sendErrorResponse(response, 404, 'It seems that the user does not have access to this locker')

    if (deleteAllAccess) {
      const allCompartmentAccess = await AccessPermissionCompartment.query()
      .where('access_permission_id', accessPermission.id)

      for (const apc of allCompartmentAccess) {
        await apc.delete()
      }

      await accessPermission.delete()
      await lockerUserRole.delete()
    } else {
      if(!compartmentNumber) return sendErrorResponse(response, 400, 'Invalid query params', {'compartmentNumber': 'compartmentNumber is required when deleteAllAccess is false'})
      if(isNaN(compartmentNumber) || !isInteger(compartmentNumber) || compartmentNumber <= 0) 
        return sendErrorResponse(response, 400, 'Invalid query params', {'compartmentNumber': 'compartmentNumber must be a positive integer'})
        
      const compartment = await Compartment.query()
      .where('locker_id', lockerId)
      .where('compartment_number', compartmentNumber)
      .first()

      if (!compartment) return sendErrorResponse(response, 404, 'Compartment not found')

      const accessPermissionCompartment = await AccessPermissionCompartment.query()
        .where('access_permission_id', accessPermission.id)
        .where('compartment_id', compartment.id)
        .first()

      if (!accessPermissionCompartment) return sendErrorResponse(response, 404, 'Access permission compartment not found')

      await accessPermissionCompartment.delete()
    }

    return sendSuccessResponse(response, 200, 'User access to compartment removed successfully')
  }

  async lockersWithoutSchedules(ctx: HttpContext) {
    const { response, passportUser } = ctx
    const pagination = await validatePagination(ctx)
    if (!pagination) return

    const { page, limit } = pagination

    const lockersQuery = await Locker.query()
      .whereHas('lockerUserRoles', (lurQuery) => {
        lurQuery
          .where('user_id', passportUser.id)
          .whereIn('role', ['admin', 'super_admin'])
      })
      .whereDoesntHave('schedules', () => {})
      .orderBy('id', 'asc')
      .preload('area', (areaQuery) => {
        areaQuery.preload('organization')
      })
      .paginate(page, limit)

    const queryResults = lockersQuery.toJSON()

    const items = queryResults.data.map((locker) => ({
      locker_id: locker.id,
      locker_serial_number: locker.serialNumber,
      locker_number: locker.lockerNumber,
      area: locker.area?.name,
      organization: locker.area?.organization?.name,
    }))

    return sendSuccessResponse(
      response,
      200,
      'Lockers without schedules retrieved successfully',
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

  async getAreaLockers(ctx: HttpContext) {
    const { request, response, passportUser } = ctx
    const pagination = await validatePagination(ctx)
    if (!pagination) return

    const { page, limit} = pagination
    const areaId = Number(request.param('areaId'))

    const lockersQuery = await Locker.query()
      .where('area_id', areaId)
      .whereHas('lockerUserRoles', (lurQuery) => {
        lurQuery
          .where('user_id', passportUser.id)
          .whereIn('role', ['admin', 'super_admin'])
      })
      .preload('area', (areaQuery) => {
        areaQuery.preload('organization')
      })
      .orderBy('id', 'asc')
      .paginate(page, limit)

    const queryResults = lockersQuery.toJSON()

    const items = queryResults.data.map((locker) => ({
      locker_id: locker.id,
      locker_serial_number: locker.serialNumber,
      organization_id: locker.area?.organization?.id,
      organization_name: locker.area?.organization?.name,
      area_id: locker.area?.id,
      area_name: locker.area?.name,
    }));

    return sendSuccessResponse(
      response,
      200,
      'Area lockers retrieved successfully',
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
}
