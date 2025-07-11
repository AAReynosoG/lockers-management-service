import router from '@adonisjs/core/services/router'
import { middleware } from '#start/kernel'

const OrganizationController = () => import('#controllers/organizations_controller')
const LockerController = () => import('#controllers/lockers_controller')
const LockerConfigController = () => import('#controllers/lockers_configs_controller')
const ScheduleController = () => import('#controllers/schedules_controller')

router
  .group(() => {

    router.group(() => {
      router.post('', [OrganizationController, 'createOrganizationAndArea'])
      router.get('', [OrganizationController, 'getOrganizations'])
      router.put(':organizationId', [OrganizationController, 'updateOrganization'])
      .use(middleware.validateNumericParams(['organizationId']))
      router.get(':organizationId/areas', [OrganizationController, 'getOrganizationAreas'])
      .use(middleware.validateNumericParams(['organizationId']))
    }).prefix('/organizations')

    router.group(() => {
      router.get('/:lockerId/compartments', [LockerController, 'getLockerCompartments'])
      .use(middleware.validateNumericParams(['lockerId']))
      router.get('', [LockerController, 'getLockers'])
      router.put('', [LockerController, 'moveLockerToArea'])
      router.put(':lockerId/:compartmentNumber/users', [LockerController, 'assignUserToCompartment'])
      .use(middleware.validateNumericParams(['lockerId', 'compartmentNumber']))
      router.get('/user-list/:organizationId', [LockerController, 'getUsersWithLockersByOrganization'])
      .use(middleware.validateNumericParams(['organizationId']))
      router.delete(':lockerId/:userId', [LockerController, 'removeUserAccessToCompartment'])
      .use(middleware.validateNumericParams(['lockerId', 'userId']))
      router.post(':lockerId/schedules', [ScheduleController, 'createSchedule'])
      .use(middleware.validateNumericParams(['lockerId']))
      router.put(':lockerId/schedules/:scheduleId', [ScheduleController, 'updateSchedule'])
      .use(middleware.validateNumericParams(['lockerId', 'scheduleId']))
      router.get(':lockerId/schedules', [ScheduleController, 'getLockerSchedules'])
      .use(middleware.validateNumericParams(['lockerId']))
    }).prefix('/lockers')

  })
  .use(middleware.passportAuth())
  .prefix('/api')

  router
    .group(() => {
      router.get('/:serialNumber', [LockerConfigController, 'getLockerConfig'])
      router.post('create-locker', [LockerConfigController, 'createLocker'])
  })
  .prefix('/api/locker-config').use(middleware.iotAuth())
