import { Action } from '@ngrx/store';
import { normalize } from 'normalizr';

import { entityCatalog } from '../../entity-catalog/entity-catalog';
import { StratosBaseCatalogEntity } from '../../entity-catalog/entity-catalog-entity/entity-catalog-entity';
import { IStratosEntityDefinition } from '../../entity-catalog/entity-catalog.types';
import { ApiRequestTypes } from '../../reducers/api-request-reducer/request-helpers';
import { NormalizedResponse } from '../../types/api.types';
import { EntityRequestAction } from '../../types/request.types';
import { PipelineResult } from '../entity-request-pipeline.types';
import { getSuccessMapper } from '../pipeline-helpers';
import { endpointErrorsHandlerFactory } from './endpoint-errors.handler';
import { patchActionWithForcedConfig } from './forced-action-type.helpers';
import { HandledMultiEndpointResponse, JetstreamError, MultiEndpointResponse } from './handle-multi-endpoints.pipe';
import { multiEndpointResponseMergePipe } from './merge-multi-endpoint-data.pipe';

const baseErrorHandler = () => 'Api Request Failed';

function createErrorMessage(definition: IStratosEntityDefinition, errors: JetstreamError[]) {
  const errorMessageHandler = definition.errorMessageHandler || definition.endpoint.globalErrorMessageHandler || baseErrorHandler;
  return errorMessageHandler(errors);
}

// function getEntitySuccessMapper(entityKey: string): SuccessfulApiResponseDataMapper<any, any> {
//   const innerCatalogEntity = entityCatalog.getEntityFromKey(entityKey) as StratosBaseCatalogEntity;
//   // TODO: RC success mapper should run before normalizedEntities created in getNormalizedEntityData
//   const entitySuccessMapper = getSuccessMapper(innerCatalogEntity);
// }

function mapEntities<T = any>(
  entities: T[],
  action: EntityRequestAction,
): T[] {
  const innerCatalogEntity = entityCatalog.getEntity(action);
  const entitySuccessMapper = getSuccessMapper(innerCatalogEntity);
  return entities.map(entity => {
    return entitySuccessMapper(
      entity,
      action.endpointGuid,
      action.guid,
      innerCatalogEntity.entityKey, // TODO: RC check
      action.endpointType,
      action
    );
  });
}

function getEntities(
  endpointResponse: {
    normalizedEntities: NormalizedResponse<any>;
    endpointGuid: string;
  },
  action: EntityRequestAction
): { [entityKey: string]: any[]; } {
  return Object.keys(endpointResponse.normalizedEntities.entities).reduce(
    (newEntities, entityKey) => {
      const innerCatalogEntity = entityCatalog.getEntityFromKey(entityKey) as StratosBaseCatalogEntity;
      // TODO: RC success mapper should run before normalizedEntities created in getNormalizedEntityData
      const entitySuccessMapper = getSuccessMapper(innerCatalogEntity);
      const entities = entitySuccessMapper ? Object.keys(endpointResponse.normalizedEntities.entities[entityKey]).reduce(
        (newEntitiesOfType, guid) => {
          const entity = entitySuccessMapper(
            endpointResponse.normalizedEntities.entities[entityKey][guid],
            endpointResponse.endpointGuid,
            guid,
            entityKey,
            action.endpointType,
            action
          );
          const newGuid = entity ? innerCatalogEntity.getGuidFromEntity(entity) || guid : guid;
          return {
            ...newEntitiesOfType,
            [newGuid]: entity
          };
        }, {}
      ) : Object.values(endpointResponse.normalizedEntities[entityKey]);
      return {
        ...newEntities,
        [entityKey]: entities
      };
    }, {});
}
// function getEntities2(
//   entities: any[],
//   action: EntityRequestAction
// ): { [entityKey: string]: any[]; } {
//   return Object.keys(endpointResponse.normalizedEntities.entities).reduce((newEntities, entityKey) => {
//     const innerCatalogEntity = entityCatalog.getEntityFromKey(entityKey) as StratosBaseCatalogEntity;
//     // TODO: RC success mapper should run before normalizedEntities created in getNormalizedEntityData
//     const entitySuccessMapper = getSuccessMapper(innerCatalogEntity);

//     return entitySuccessMapper ? entities.map(entity => {
//       const mappedEntity = entitySuccessMapper(
//         entity,
//         action.endpointGuid,
//         action.guid,
//         entityKey,
//         action.endpointType,
//         action
//       );
//       const newGuid = mappedEntity ? innerCatalogEntity.getGuidFromEntity(mappedEntity) || action.guid : action.guid;
//       return {
//         ...newEntitiesOfType,
//         [newGuid]: entity
//       };
//     }) :
//       entities;

//     return {
//       ...newEntities,
//       [entityKey]: entities2
//     };
//   }, {});
// }


function getSchema(
  action: EntityRequestAction,
  catalogueEntity: StratosBaseCatalogEntity
) {
  // Can patchActionWithForcedConfig be done outside of the pipe?
  // This pipe shouldn't have to worry about the multi entity lists.
  const patchedAction = patchActionWithForcedConfig(action);
  const schema = patchedAction.entity || catalogueEntity.getSchema(patchedAction.schemaKey);
  return Array.isArray(schema) ? schema[0] : schema;
}

// TODO: Type the output of this pipe. #3976
function getNormalizedEntityData(
  entities: any[],
  action: EntityRequestAction,
  catalogueEntity: StratosBaseCatalogEntity) {
  const arraySafeSchema = getSchema(action, catalogueEntity);
  return normalize(entities, Array.isArray(entities) ? [arraySafeSchema] : arraySafeSchema);
}

function canNormalizeBeforeMap(
  action: EntityRequestAction,
  catalogueEntity: StratosBaseCatalogEntity
): boolean {
  const arraySafeSchema = getSchema(action, catalogueEntity);
  // If there's items in the schema then we're safe to normalize before the map
  return Object.keys(arraySafeSchema.schema).length > 0;
}

export function mapMultiEndpointResponses(
  action: EntityRequestAction,
  catalogEntity: StratosBaseCatalogEntity,
  requestType: ApiRequestTypes,
  multiEndpointResponses: HandledMultiEndpointResponse,
  actionDispatcher: (actionToDispatch: Action) => void,
): PipelineResult {
  const endpointErrorHandler = endpointErrorsHandlerFactory(actionDispatcher);
  endpointErrorHandler(
    action,
    catalogEntity,
    requestType,
    multiEndpointResponses.errors
  );

  if (multiEndpointResponses.errors && multiEndpointResponses.errors.length) {
    const errorMessage = createErrorMessage(catalogEntity.definition as IStratosEntityDefinition, multiEndpointResponses.errors);
    return {
      success: false,
      errorMessage
    };
  } else {

    const responses = multiEndpointResponses.successes
      .map((responseData: MultiEndpointResponse<any>) => {
        if (canNormalizeBeforeMap(action, catalogEntity)) {
          const endpointResponse = {
            normalizedEntities: getNormalizedEntityData(responseData.entities, action, catalogEntity),
            endpointGuid: responseData.endpointGuid,
            totalResults: responseData.totalResults,
            totalPages: responseData.totalPages
          };
          const entities = getEntities(endpointResponse, action);
          const parentEntities = entities[catalogEntity.entityKey];
          return {
            response: {
              entities,
              // If we changed the guid of the entities then make sure this is reflected in the result array.
              result: parentEntities ? Object.keys(parentEntities) : endpointResponse.normalizedEntities.result,
            },
            totalPages: endpointResponse.totalPages,
            totalResults: endpointResponse.totalResults,
            success: null
          };
        } else {
          const entities = mapEntities(responseData.entities, action);
          const endpointResponse = {
            normalizedEntities: getNormalizedEntityData(entities, action, catalogEntity),
            endpointGuid: responseData.endpointGuid,
            totalResults: responseData.totalResults,
            totalPages: responseData.totalPages
          };
          return {
            response: endpointResponse.normalizedEntities,
            totalPages: endpointResponse.totalPages,
            totalResults: endpointResponse.totalResults,
            success: null
          };
        }
      })
      ;
    const response = multiEndpointResponseMergePipe(responses);
    return {
      ...response,
      success: true,
    };
  }
}
