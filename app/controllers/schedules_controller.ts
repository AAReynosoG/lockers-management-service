import type { HttpContext } from '@adonisjs/core/http'
import { createScheduleValidator, updateScheduleValidator } from '#validators/schedule'
import { sendErrorResponse, sendSuccessResponse } from '../helpers/response.js'
import ScheduleService from '#services/schedule_service'
import { IsAdminService } from '#services/is_admin_service'
import Schedule from '#models/schedule'
import { validatePagination } from '../helpers/validate_query_params.js'
import Locker from '#models/locker'
import LockerUserRole from '#models/locker_user_role'
import { isInteger } from '@sindresorhus/is'
import BackgroundLogger from '#services/background_logger'

export default class SchedulesController {

  async createSchedule({ request, response, passportUser }: HttpContext) {
    const payload = await request.validateUsing(createScheduleValidator)
    const lockerId = Number(request.param('lockerId'))

    const isAdmin = await IsAdminService.isAdmin(lockerId, passportUser.id, ['admin', 'super_admin'])
    if(!isAdmin) return sendErrorResponse(response, 403, 'You must be an admin or super_admin in that Locker')

    try {
      await ScheduleService.validateAndCreate(payload, lockerId, passportUser.id)

      const locker = await Locker
          .query()
          .where('id', lockerId)
          .preload('area', (areaQuery) => {
            areaQuery.preload('organization')
          })
          .first()

      const passportUserRole = await LockerUserRole.query()
          .where('lockerId', lockerId)
          .where('userId', passportUser.id)
          .first()
      
      const data = {
        description: ` Schedule created for locker ${locker?.serialNumber} by user ${passportUser.name} ${passportUser.lastName} (${passportUser.email})`,
        locker: locker ? {
          locker_serial_number: locker.serialNumber,
          manipulated_compartment: null,
          number_in_area: locker.lockerNumber,
          area_name: locker.area.name,
          organization_name: locker.area.organization.name
        } : {},
        performed_by: {
          full_name: `${passportUser.name} ${passportUser.lastName} ${passportUser.secondLastName}`,
          email: passportUser.email,
          role: passportUserRole ? passportUserRole.role : 'unknown role'
        },
        extra: {
          payload
        },
        tartget_user: null,
        timestamp: new Date(),
      }

      BackgroundLogger.addLogs(data ,'audit_logs', false)

      return sendSuccessResponse(response, 201, 'Operation completed successfully')
    } catch (error) {
      return sendErrorResponse(response, error.statusCode, error.message)
    }
  }

  async updateSchedule({ request, response, passportUser }: HttpContext) {
    const payload = await request.validateUsing(updateScheduleValidator)
    const lockerId = Number(request.param('lockerId'))
    const scheduleId = Number(request.param('scheduleId'))

    const isAdmin = await IsAdminService.isAdmin(lockerId, passportUser.id, ['admin', 'super_admin'])
    if(!isAdmin) return sendErrorResponse(response, 403, 'You must be an admin or super_admin in that Locker')

    try {
      await ScheduleService.validateAndUpdate(scheduleId, payload, lockerId)

      const locker = await Locker
          .query()
          .where('id', lockerId)
          .preload('area', (areaQuery) => {
            areaQuery.preload('organization')
          })
          .first()

      const passportUserRole = await LockerUserRole.query()
          .where('lockerId', lockerId)
          .where('userId', passportUser.id)
          .first()
      
      const data = {
        description: ` Schedule update for locker ${locker?.serialNumber} by user ${passportUser.name} ${passportUser.lastName} (${passportUser.email})
         `,
        locker: locker ? {
          locker_serial_number: locker.serialNumber,
          manipulated_compartment: null,
          number_in_area: locker.lockerNumber,
          area_name: locker.area.name,
          organization_name: locker.area.organization.name
        } : {},
        performed_by: {
          full_name: `${passportUser.name} ${passportUser.lastName} ${passportUser.secondLastName}`,
          email: passportUser.email,
          role: passportUserRole ? passportUserRole.role : 'unknown role'
        },
        extra: {
          payload
        },
        tartget_user: null,
        timestamp: new Date(),
      }

      BackgroundLogger.addLogs(data ,'audit_logs', false)

      return sendSuccessResponse(response, 201, 'Operation completed successfully')
    } catch (error) {
      return sendErrorResponse(response, error.statusCode, error.message)
    }

  }

  async getLockerSchedules(ctx: HttpContext) {
    const { request, response, passportUser } = ctx
    const pagination = await validatePagination(ctx)
    if (!pagination) return

    const { page, limit } = pagination
    const lockerId = Number(request.param('lockerId'))

    const isAdmin = await IsAdminService.isAdmin(lockerId, passportUser.id, ['admin', 'super_admin'])
    if(!isAdmin) return sendErrorResponse(response, 403, 'You must be an admin or super_admin in that Locker')

    const schedulesQuery = await Schedule
      .query()
      .where('lockerId', lockerId)
      .orderBy('id', 'asc')
      .paginate(page, limit)

    const queryResults = schedulesQuery.toJSON()

    const items = queryResults.data.map((schedule) => ({
      id: schedule.id,
      day_of_week: schedule.dayOfWeek,
      start_time: schedule.startTime,
      end_time: schedule.endTime,
      repeat_schedule: schedule.repeatSchedule,
      schedule_date: schedule.scheduleDate,
    }))

    return sendSuccessResponse(
      response,
      200,
      'Schedules retrieved successfully',
      {
        items: items,
        total: schedulesQuery.total,
        page: page,
        limit: limit,
        has_next_page: schedulesQuery.currentPage < schedulesQuery.lastPage,
        has_previous_page: schedulesQuery.currentPage > 1,
      }
    )
  }

  async deleteSchedule({request, response, passportUser}: HttpContext) {
    const lockerId = Number(request.param('lockerId'))
    const scheduleId = Number(request.input('scheduleId'))
    const deleteAllSchedules = request.input('deleteAllSchedules', 'false') === 'true'

    const locker = await Locker
          .query()
          .where('id', lockerId)
          .preload('area', (areaQuery) => {
            areaQuery.preload('organization')
          })
          .first()

    if(!locker) return sendErrorResponse(response, 404, 'Locker not found')

    const isAdmin = await IsAdminService.isAdmin(lockerId, passportUser.id, ['admin', 'super_admin'])
    if(!isAdmin) return sendErrorResponse(response, 403, 'You must be an admin or super_admin in that Locker')

    let description = ''
    let extra = {}

    if(deleteAllSchedules) {
      const schedules = await Schedule.query()
      .where('locker_id', locker.id)

      for (const schedule of schedules) {
        await schedule.delete()
      }

      description = `All schedules deleted for locker ${locker.serialNumber} by user ${passportUser.name} ${passportUser.lastName} (${passportUser.email})`
    } else {
        if(!scheduleId) return sendErrorResponse(response, 400, 'Invalid query params', {'scheduleId': 'scheduleId is required when deleteAllSchedules is false'})
        if(isNaN(scheduleId) || !isInteger(scheduleId) || scheduleId <= 0) 
          return sendErrorResponse(response, 400, 'Invalid query params', {'scheduleId': 'scheduleId must be a positive integer'})

        const schedule = await Schedule.find(scheduleId)

        if (!schedule) return sendErrorResponse(response, 404, 'Schedule not found')

        await schedule.delete()

        description = `Schedule deleted for locker ${locker.serialNumber} by user ${passportUser.name} ${passportUser.lastName} (${passportUser.email})`
        extra = {
          deleted_schedule: schedule
         }
      }

      const passportUserRole = await LockerUserRole.query()
          .where('lockerId', lockerId)
          .where('userId', passportUser.id)
          .first()
      
      const data = {
        description: description,
        locker: {
          locker_serial_number: locker.serialNumber,
          manipulated_compartment: null,
          number_in_area: locker.lockerNumber,
          area_name: locker.area.name,
          organization_name: locker.area.organization.name
        },
        performed_by: {
          full_name: `${passportUser.name} ${passportUser.lastName} ${passportUser.secondLastName}`,
          email: passportUser.email,
          role: passportUserRole ? passportUserRole.role : 'unknown role'
        },
        extra: extra,
        tartget_user: null,
        timestamp: new Date(),
      }

      BackgroundLogger.addLogs(data ,'audit_logs', false)

      return sendSuccessResponse(response, 200, 'Schedule deleted successfully')
  }
}
