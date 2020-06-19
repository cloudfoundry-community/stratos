import { generateStratosEntities } from '../../core/src/stratos-entities';
import { BaseTestModules } from '../../core/test-framework/core-test.helper';
import { EntityCatalogTestModule, TEST_CATALOGUE_ENTITIES } from '../../store/src/entity-catalog-test.module';
import { generateCFEntities } from '../src/cf-entity-generator';

export const CFBaseTestModules = [
  ...BaseTestModules,
  {
    ngModule: EntityCatalogTestModule,
    providers: [
      {
        provide: TEST_CATALOGUE_ENTITIES, useValue: [
          ...generateStratosEntities(),
          ...generateCFEntities()
        ]
      }
    ]
  }
];
