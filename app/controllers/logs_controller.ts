import type { HttpContext } from '@adonisjs/core/http'
import { Buffer } from 'buffer'
import { createClient } from '@supabase/supabase-js'
import env from '#start/env'
import { storeLogValidator } from '#validators/log'
import { sendErrorResponse, sendSuccessResponse } from '../helpers/response.js'
import Locker from '#models/locker'
import LockerUserRole from '#models/locker_user_role'
import { SlackService } from '#services/slack_service'
import { getDb } from '#services/mongo_service'
import { IsAdminService } from '#services/is_admin_service'
import { validatePagination } from '../helpers/validate_query_params.js'
import UnifiedBackgroundProcessor from '#services/unified_background_processor_service'
import Area from '#models/area'
import Organization from '#models/organization'

const supabaseUrl = env.get('SUPABASE_URL')!
const supabaseKey = env.get('SUPABASE_API_KEY')!
const supabase = createClient(supabaseUrl, supabaseKey)

export default class LogsController {
    async storeAccessLogs({request, response}: HttpContext) {
        const params = await request.validateUsing(storeLogValidator)
        const { logs } = params

        try {
            const serialNumbers = [...new Set(logs.map(log => log.serial_number))]
            const userIds = [...new Set(logs.map(log => log.user_id))]

            const lockersData = await Locker.query()
                .whereIn('serial_number', serialNumbers)
                .preload('area', (areaQuery) => {
                    areaQuery.preload('organization')
            })

            const userRolesData = await LockerUserRole.query()
            .whereIn('locker_id', lockersData.map(l => l.id))
            .whereIn('user_id', userIds)
            .preload('user')

            const lockerMap = new Map(lockersData.map(l => [l.serialNumber, l]))
                const userRoleMap = new Map(
                userRolesData.map(ur => [`${ur.lockerId}-${ur.userId}`, ur])
            )

            const results = await Promise.allSettled(
                logs.map(async (log) => {
                    const { image_base_64, file_name, serial_number, user_id, compartment_number, action, source } = log

                    const imageUploadPromise = (image_base_64 && file_name) 
                    ? this.uploadImage(image_base_64, file_name, serial_number)
                    : Promise.resolve('')

                    const locker = lockerMap.get(serial_number)
                    const userRole = locker ? userRoleMap.get(`${locker.id}-${user_id}`) : null

                    const [path] = await Promise.all([imageUploadPromise])

                    return {
                        performed_by: userRole ? {
                            full_name: `${userRole.user.name} ${userRole.user.lastName} ${userRole.user.secondLastName}`,
                            email: userRole.user.email,
                            role: userRole.role
                        } : {},
                        locker: locker ? {
                            locker_id: locker.id,
                            locker_serial_number: locker.serialNumber,
                            manipulated_compartment: compartment_number,
                            number_in_area: locker.lockerNumber,
                            area_id: locker.areaId,
                            area_name: locker.area.name,
                            organization_id: locker.area.organizationId,
                            organization_name: locker.area.organization.name
                        } : {},
                        photo_path: path,
                        action,
                        source,
                        timestamp: new Date(),
                    }
                })
            )

            const successful = results
            .filter(result => result.status === 'fulfilled')
            .map(result => (result as PromiseFulfilledResult<any>).value)

            const logsBySerial = new Map<string, any[]>()
            successful.forEach(log => {
                const serialNumber = log.locker?.locker_serial_number
                if (serialNumber) {
                    if (!logsBySerial.has(serialNumber)) {
                        logsBySerial.set(serialNumber, [])
                    }
                    logsBySerial.get(serialNumber)!.push(log)
                }
            })

            for (const [serialNumber, serializLogs] of logsBySerial) {
                UnifiedBackgroundProcessor.addLogs(
                    serializLogs, 
                    'lockers_logs', 
                    true,
                    true, 
                    serialNumber
                )
            }

            return sendSuccessResponse(response, 201, 'Logs processed', {
                total: logs.length,
                successful: successful.length,
                failed: results.length - successful.length,
                results: successful
            })

        } catch (error) {
            return sendErrorResponse(response, 500, 'Error processing logs', error)
        }
    }

    private async uploadImage(image_base_64: string, file_name: string, serial_number: string): Promise<string> {
        try {
            const buffer = Buffer.from(image_base_64, 'base64')
            
            const { data } = await supabase.storage
            .from('lockity-images')
            .upload(`lockers/${serial_number}/${file_name}`, buffer, {
                contentType: 'image/png',
                upsert: true
            })
            
            return data!.path
        } catch (error) {
            await new SlackService().sendExceptionMessage(error, 500)
            return ''
        }
    }

    private async getLogsBase(
        ctx: HttpContext, 
        collectionName: string, 
        allowedRoles: string[],
        validActions?: string[]
    ) {
        const { request, response, passportUser } = ctx
        const pagination = await validatePagination(ctx)
        if (!pagination) return

        const serialNumber = String(request.param('lockerSerialNumber'))

        const locker = await Locker.query()
            .where('serial_number', serialNumber)
            .preload('area', (areaQuery) => {
                areaQuery.preload('organization')
            })
            .first()
        
        if (!locker) return sendErrorResponse(response, 404, 'Locker not found')

        const isAdmin = await IsAdminService.isAdmin(locker.id, passportUser.id, allowedRoles)
        if (!isAdmin) return sendErrorResponse(response, 403, 'You do not have access to this locker')

        const { page, limit } = pagination

        const performerEmail = request.input('performerEmail')  
        const action = request.input('action')
        const compartment = request.input('compartment') ? Number(request.input('compartment')) : undefined
        const dateFrom = request.input('dateFrom')
        const dateTo = request.input('dateTo')

        if (validActions && action && !validActions.includes(action)) {
            return sendErrorResponse(response, 400, `Invalid action. Must be one of: ${validActions.join(', ')}`)
        }

        if (dateFrom && !/^\d{4}-\d{2}-\d{2}$/.test(dateFrom)) {
            return sendErrorResponse(response, 400, 'Invalid date_from format. Use YYYY-MM-DD')
        }
        if (dateTo && !/^\d{4}-\d{2}-\d{2}$/.test(dateTo)) {
            return sendErrorResponse(response, 400, 'Invalid date_to format. Use YYYY-MM-DD')
        }

        try {
            const db = await getDb('lockity_db')
            const collection = db.collection(collectionName)

            const mongoFilters: any = {
                "locker.locker_serial_number": serialNumber
            }

            if (performerEmail) {
                mongoFilters["performed_by.email"] = performerEmail
            }

            if (action) {
                mongoFilters.action = action
            }

            if (compartment) {
                mongoFilters["locker.manipulated_compartment"] = compartment
            }

            if (dateFrom || dateTo) {
                mongoFilters.timestamp = {}
                
                if (dateFrom) {
                    mongoFilters.timestamp.$gte = new Date(`${dateFrom}T00:00:00.000Z`)
                }
                
                if (dateTo) {
                    mongoFilters.timestamp.$lte = new Date(`${dateTo}T23:59:59.999Z`)
                }
            }

            const total = await collection.countDocuments(mongoFilters)

            const logs = await collection
                .find(mongoFilters)
                .sort({ timestamp: -1 })
                .skip((page - 1) * limit)
                .limit(limit)
                .toArray()

            return { logs, total, page, limit }

        } catch (error) {
            await new SlackService().sendExceptionMessage(error, 500)
            return sendErrorResponse(response, 500, 'Error retrieving logs')
        }
    }

    async getAccessLogs(ctx: HttpContext) {
        const { response } = ctx
        const validActions = ['opening', 'closing', 'failed_attempt']
        
        const result = await this.getLogsBase(
            ctx, 
            'lockers_logs', 
            ['admin', 'super_admin', 'user'],
            validActions
        )
        
        if (!result || 'success' in result) return result 

        const { logs, total, page, limit } = result

        const items = logs.map((log: any) => ({
            id: log._id,
            locker: {
                serial_number: log.locker?.locker_serial_number || '',
                number_in_the_area: log.locker?.number_in_area || 0,
                manipulated_compartment: log.locker?.manipulated_compartment || 0,
                organization_name: log.locker?.organization_name || '',
                area_name: log.locker?.area_name || ''
            },
            performed_by: {
                full_name: log.performed_by?.full_name || '',
                email: log.performed_by?.email || '',
                role: log.performed_by?.role || ''
            },
            source: log.source || '',
            photo_path: log.photo_path || null,
            timestamp: log.timestamp || null,
            action: log.action || '',
        }))

        const totalPages = Math.ceil(total / limit)

        return sendSuccessResponse(response, 200, 'Access logs retrieved successfully', {
            items,
            total,
            page,
            limit,
            has_next_page: page < totalPages,
            has_previous_page: page > 1
        })
}

    async getAuditLogs(ctx: HttpContext) {
        const { response } = ctx
        
        const result = await this.getLogsBase(
            ctx, 
            'audit_logs', 
            ['admin', 'super_admin']
        )
        
        if (!result || 'success' in result) return result 

        const { logs, total, page, limit } = result

        const items = logs.map((log: any) => ({
            id: log._id,
            description: log.description || '',
            locker: {
                serial_number: log.locker?.locker_serial_number || '',
                number_in_the_area: log.locker?.number_in_area || 0,
                manipulated_compartment: log.locker?.manipulated_compartment || null,
                organization_name: log.locker?.organization_name || '',
                area_name: log.locker?.area_name || ''
            },
            performed_by: {
                full_name: log.performed_by?.full_name || '',
                email: log.performed_by?.email || '',
                role: log.performed_by?.role || ''
            },
            target_user: log.target_user || null,
            extra: log.extra || {},
            timestamp: log.timestamp || null
        }))

        const totalPages = Math.ceil(total / limit)

        return sendSuccessResponse(response, 200, 'Audit logs retrieved successfully', {
            items,
            total,
            page,
            limit,
            has_next_page: page < totalPages,
            has_previous_page: page > 1
        })
    }

    async getLockerActivities(ctx: HttpContext) {
        const { request, response, passportUser } = ctx
        const pagination = await validatePagination(ctx)
        if (!pagination) return

        const { page, limit } = pagination
        const status = request.input('status', 'success')

        if (!['success', 'failure'].includes(status)) {
            return sendErrorResponse(response, 400, 'Invalid status parameter. Must be "success" or "failure".')
        }

        try {
            const db = await getDb('lockity_db')
            const collection = db.collection('lockers_logs')

            let actionFilter: any
            if (status === 'success') {
            actionFilter = { action: { $in: ['opening', 'closing'] } }
            } else {
            actionFilter = { action: 'failed_attempt' }
            }

            const userLockerRoles = await LockerUserRole.query()
            .where('user_id', passportUser.id)
            .andWhere('role', 'admin')
            .preload('locker')

            if (userLockerRoles.length === 0) {
            return sendSuccessResponse(response, 200, 'Locker activities retrieved successfully', {
                items: [],
                total: 0,
                page: page,
                limit: limit,
                has_next_page: false,
                has_previous_page: false
            })
            }

            const userSerialNumbers = userLockerRoles.map(role => role.locker.serialNumber)

            const mongoFilters = {
            ...actionFilter,
            "locker.locker_serial_number": { $in: userSerialNumbers }
            }

            const total = await collection.countDocuments(mongoFilters)

            const logs = await collection
            .find(mongoFilters)
            .sort({ timestamp: -1 })
            .skip((page - 1) * limit)
            .limit(limit)
            .toArray()

            const items = logs.map((log: any) => {
            const dateTime = log.timestamp 
                ? new Date(log.timestamp).toLocaleString('es-MX', {
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: false
                }).replace(',', '')
                : null

            return {
                locker_id: log.locker?.locker_id || null,
                locker_serial_number: log.locker?.locker_serial_number || '',
                compartment_number: log.locker?.manipulated_compartment || null,
                organization: log.locker?.organization_name || '',
                area: log.locker?.area_name || '',
                user: log.performed_by?.full_name || '',
                email: log.performed_by?.email || '',
                role: log.performed_by?.role || '',
                status: status,
                date_time: dateTime
            }
            })

            const totalPages = Math.ceil(total / limit)

            return sendSuccessResponse(response, 200, 'Locker activities retrieved successfully', {
            items,
            total,
            page,
            limit,
            has_next_page: page < totalPages,
            has_previous_page: page > 1
            })

        } catch (error) {
            await new SlackService().sendExceptionMessage(error, 500)
            return sendErrorResponse(response, 500, 'Error retrieving locker activities')
        }
    }

    async getAreaMovements({ request, response, passportUser }: HttpContext) {
        const areaId = Number(request.input('areaId'))
        const dateFrom = request.input('dateFrom')
        const dateTo = request.input('dateTo')

        const area = await Area.find(areaId)
        if (!area) {
            return sendErrorResponse(response, 404, 'Area not found')
        }

        const hasAccessToArea = await LockerUserRole.query()
            .where('user_id', passportUser.id)
            .andWhere('role', 'admin')
            .whereHas('locker', (lockerQuery) => {
            lockerQuery.where('area_id', areaId)
            })
            .first()

        if (!hasAccessToArea) {
            return sendErrorResponse(response, 403, 'You do not have access to this area')
        }

        const today = new Date().toISOString().split('T')[0] // YYYY-MM-DD
        const fromDate = dateFrom || today
        const toDate = dateTo || today

        if (!/^\d{4}-\d{2}-\d{2}$/.test(fromDate)) {
            return sendErrorResponse(response, 400, 'Invalid dateFrom format. Use YYYY-MM-DD')
        }
        if (!/^\d{4}-\d{2}-\d{2}$/.test(toDate)) {
            return sendErrorResponse(response, 400, 'Invalid dateTo format. Use YYYY-MM-DD')
        }

        try {
            const areaLockers = await Locker.query()
            .where('area_id', areaId)
            .select('serial_number')

            if (areaLockers.length === 0) {
            return sendSuccessResponse(response, 200, 'Movements retrieved successfully', {
                items: []
            })
            }

            const serialNumbers = areaLockers.map(locker => locker.serialNumber)

            const db = await getDb('lockity_db')
            const collection = db.collection('lockers_logs')

            const mongoFilters = {
            "locker.locker_serial_number": { $in: serialNumbers },
            "action": { $in: ['opening', 'closing', 'failed_attempt'] },
            "timestamp": {
                $gte: new Date(`${fromDate}T00:00:00.000Z`),
                $lte: new Date(`${toDate}T23:59:59.999Z`)
            }
            }

            const aggregationPipeline = [
            {
                $match: mongoFilters
            },
            {
                $group: {
                _id: {
                    $dateToString: {
                    format: "%Y-%m-%d",
                    date: "$timestamp"
                    }
                },
                count: { $sum: 1 }
                }
            },
            {
                $sort: { "_id": 1 }
            }
            ]

            const aggregationResults = await collection.aggregate(aggregationPipeline).toArray()

            const movementsByDate = new Map()
            aggregationResults.forEach(result => {
            movementsByDate.set(result._id, result.count)
            })

            const items = []
            const startDate = new Date(fromDate)
            const endDate = new Date(toDate)

            for (let currentDate = new Date(startDate); currentDate <= endDate; currentDate.setDate(currentDate.getDate() + 1)) {
            const dateString = currentDate.toISOString().split('T')[0]
            const count = movementsByDate.get(dateString) || 0
            
            items.push({
                date: dateString,
                count: count
            })
            }

            return sendSuccessResponse(response, 200, 'Movements retrieved successfully', {
            items
            })

        } catch (error) {
            await new SlackService().sendExceptionMessage(error, 500)
            return sendErrorResponse(response, 500, 'Error retrieving area movements')
        }
    }

    async getOrganizationMovements({ request, response, passportUser }: HttpContext) {
        const organizationId = Number(request.param('organizationId'))
        const dateFrom = request.input('dateFrom')
        const dateTo = request.input('dateTo')

        const organization = await Organization.find(organizationId)
        if (!organization) {
            return sendErrorResponse(response, 404, 'Organization not found')
        }

        const hasAccessToOrganization = await LockerUserRole.query()
            .where('user_id', passportUser.id)
            .whereIn('role', ['admin', 'super_admin'])
            .whereHas('locker', (lockerQuery) => {
            lockerQuery.whereHas('area', (areaQuery) => {
                areaQuery.where('organization_id', organizationId)
            })
            })
            .first()

        if (!hasAccessToOrganization) {
            return sendErrorResponse(response, 403, 'You do not have admin access to this organization')
        }

        const today = new Date().toISOString().split('T')[0] // YYYY-MM-DD
        const fromDate = dateFrom || today
        const toDate = dateTo || today

        if (!/^\d{4}-\d{2}-\d{2}$/.test(fromDate)) {
            return sendErrorResponse(response, 400, 'Invalid dateFrom format. Use YYYY-MM-DD')
        }
        if (!/^\d{4}-\d{2}-\d{2}$/.test(toDate)) {
            return sendErrorResponse(response, 400, 'Invalid dateTo format. Use YYYY-MM-DD')
        }

        try {
            const organizationLockers = await Locker.query()
            .whereHas('area', (areaQuery) => {
                areaQuery.where('organization_id', organizationId)
            })
            .select('serial_number')

            if (organizationLockers.length === 0) {
            return sendSuccessResponse(response, 200, 'Movements retrieved successfully', {
                items: []
            })
            }

            const serialNumbers = organizationLockers.map(locker => locker.serialNumber)

            const db = await getDb('lockity_db')
            const collection = db.collection('lockers_logs')

            const mongoFilters = {
            "locker.locker_serial_number": { $in: serialNumbers },
            "action": { $in: ['opening', 'closing', 'failed_attempt'] },
            "timestamp": {
                $gte: new Date(`${fromDate}T00:00:00.000Z`),
                $lte: new Date(`${toDate}T23:59:59.999Z`)
            }
            }

            const aggregationPipeline = [
            {
                $match: mongoFilters
            },
            {
                $group: {
                _id: {
                    $dateToString: {
                    format: "%Y-%m-%d",
                    date: "$timestamp"
                    }
                },
                count: { $sum: 1 }
                }
            },
            {
                $sort: { "_id": 1 }
            }
            ]

            const aggregationResults = await collection.aggregate(aggregationPipeline).toArray()

            const movementsByDate = new Map()
            aggregationResults.forEach(result => {
            movementsByDate.set(result._id, result.count)
            })

            const items = []
            const startDate = new Date(fromDate)
            const endDate = new Date(toDate)

            for (let currentDate = new Date(startDate); currentDate <= endDate; currentDate.setDate(currentDate.getDate() + 1)) {
            const dateString = currentDate.toISOString().split('T')[0]
            const count = movementsByDate.get(dateString) || 0
            
            items.push({
                date: dateString,
                count: count
            })
            }

            return sendSuccessResponse(response, 200, 'Movements retrieved successfully', {
            items
            })

        } catch (error) {
            await new SlackService().sendExceptionMessage(error, 500)
            return sendErrorResponse(response, 500, 'Error retrieving organization movements')
        }
        } 
}