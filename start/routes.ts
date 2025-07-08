import router from '@adonisjs/core/services/router'
import { middleware } from '#start/kernel'

const OrganizationController = () => import('#controllers/organizations_controller')
const LockerController = () => import('#controllers/lockers_controller')
const LockerConfigController = () => import('#controllers/lockers_configs_controller')
router
  .group(() => {

    router.group(() => {
      router.post('', [OrganizationController, 'createOrganizationAndArea'])
      router.get('', [OrganizationController, 'getOrganizations'])
    }).prefix('/organizations')

    router.group(() => {
      router.get('/:lockerId/compartments', [LockerController, 'getLockerCompartments'])
      router.get('/:showSchedules?', [LockerController, 'getLockers'])
      router.post(':lockerId/:compartmentNumber/users', [LockerController, 'assignUserToCompartment'])
      router.get('/user-list/:organizationId', [LockerController, 'getUsersWithLockersByOrganization'])
    }).prefix('/lockers')

  })
  .use(middleware.passportAuth())
  .prefix('/api')

  router
    .group(() => {
      router.get('/:lockerId', [LockerConfigController, 'getLockerConfig'])
      router.post('/:lockerId/create-topic', [LockerConfigController, 'createLockerTopics'])

  })
  .prefix('/api/locker-config').use(middleware.iotAuth())
