import router from '@adonisjs/core/services/router'
import { middleware } from '#start/kernel'

const OrganizationController = () => import('#controllers/organizations_controller')
const LockerController = () => import('#controllers/lockers_controller')
const LockerConfigController = () => import('#controllers/lockers_configs_controller')
const ScheduleController = () => import('#controllers/schedules_controller')
const AreaController = () => import('#controllers/areas_controller')
const LogsController = () => import('#controllers/logs_controller')
const DeviceController = () => import('#controllers/devices_controller')

router
  .group(() => {
    router.group(() => {
      router.get(':areaId/movements/chart', [LogsController, 'getAreaMovements'])
      .use(middleware.validateNumericParams(['areaId']))
    }).prefix('/areas')

    router.group(() => {
      router.post('', [OrganizationController, 'createOrganizationAndArea'])
      router.get(':role', [OrganizationController, 'getOrganizations'])
      router.put(':organizationId', [OrganizationController, 'updateOrganization'])
      .use(middleware.validateNumericParams(['organizationId']))
      router.get(':organizationId/areas', [OrganizationController, 'getOrganizationAreas'])
      .use(middleware.validateNumericParams(['organizationId']))

      router.post(':organizationId/areas', [AreaController, 'createArea'])
      .use(middleware.validateNumericParams(['organizationId']))
      router.put(':areaId/areas', [AreaController, 'updateArea'])
      .use(middleware.validateNumericParams(['areaId']))
    }).prefix('/organizations')

    router.group(() => {
      router.get('/:lockerId/compartments', [LockerController, 'getLockerCompartments'])
      .use(middleware.validateNumericParams(['lockerId']))
      router.get(':role', [LockerController, 'getLockers'])
      router.put('', [LockerController, 'moveLockerToArea'])
      router.put(':lockerId/:compartmentNumber/users', [LockerController, 'assignUserToCompartment'])
      .use(middleware.validateNumericParams(['lockerId', 'compartmentNumber']))
      router.get('/user-list/:organizationId', [LockerController, 'getUsersWithLockersByOrganization'])
      .use(middleware.validateNumericParams(['organizationId']))
      router.delete(':lockerId/:userId', [LockerController, 'removeUserAccessToCompartment'])
      .use(middleware.validateNumericParams(['lockerId', 'userId']))
      router.get('no-schedules', [LockerController, 'lockersWithoutSchedules'])
      router.get(':areaId/:role', [LockerController, 'getAreaLockers'])
      .use(middleware.validateNumericParams(['areaId']))
      router.get(':serialNumber/:compartmentNumber', [LockerController, 'getCompartmentStatus'])
      .use(middleware.validateNumericParams(['compartmentNumber']))
      router.get('/activities', [LogsController, 'getLockerActivities'])

      router.post(':lockerId/schedules', [ScheduleController, 'createSchedule'])
      .use(middleware.validateNumericParams(['lockerId']))
      router.put(':lockerId/schedules/:scheduleId', [ScheduleController, 'updateSchedule'])
      .use(middleware.validateNumericParams(['lockerId', 'scheduleId']))
      router.get(':lockerId/schedules', [ScheduleController, 'getLockerSchedules'])
      .use(middleware.validateNumericParams(['lockerId']))
      router.delete(':lockerId/schedules/delete', [ScheduleController, 'deleteSchedule'])
      .use(middleware.validateNumericParams(['lockerId']))
    }).prefix('/lockers')

    router.group(() => { 
      router.post('register', [DeviceController, 'storeDeviceToken'])
      router.delete('unregister', [DeviceController, 'destroyDeviceToken'])
    }).prefix('/notifications')

    router.get('/access-logs/:lockerSerialNumber', [LogsController, 'getAccessLogs'])
    router.get('/audit-logs/:lockerSerialNumber', [LogsController, 'getAuditLogs'])
  })
  .use(middleware.passportAuth())
  .prefix('/api')

  router
    .group(() => {
      router.get('/:serialNumber', [LockerConfigController, 'getLockerConfig'])
      router.post('create-locker', [LockerConfigController, 'createLocker'])
      router.get('schedules/:serialNumber', [LockerConfigController, 'getLockerSchedules'])
      router.put(':serialNumber/:compartmentNumber/:status', [LockerConfigController, 'updateCompartmentStatus'])
      .use(middleware.validateNumericParams(['compartmentNumber']))
      router.post('store-log', [LogsController, 'storeAccessLogs'])
  })
  .prefix('/api/locker-config').use(middleware.iotAuth())


  
