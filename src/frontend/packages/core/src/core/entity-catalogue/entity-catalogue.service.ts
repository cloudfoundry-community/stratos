import { STRATOS_ENDPOINT_TYPE } from '../../base-entity-schemas';
import {
  StratosBaseCatalogueEntity,
  StratosCatalogueEndpointEntity,
  StratosCatalogueEntity,
} from './entity-catalogue-entity';
import { EntityCatalogueHelpers } from './entity-catalogue.helper';
import { EntityCatalogueEntityConfig, IEntityMetadata, IStratosBaseEntityDefinition } from './entity-catalogue.types';
import { ActionReducer } from '@ngrx/store';
import { ExtraApiReducers } from '../../../../store/src/reducers/api-request-reducers.generator.helpers';
import { BaseRequestDataState } from '../../../../store/src/types/entity.types';
import { IRequestEntityTypeState } from '../../../../store/src/app-state';

class EntityCatalogue {
  private entities: Map<string, StratosCatalogueEntity> = new Map();
  private endpoints: Map<string, StratosCatalogueEndpointEntity> = new Map();

  private registerEndpoint(endpoint: StratosCatalogueEndpointEntity) {
    if (this.endpoints.has(endpoint.entityKey)) {
      console.warn(`Duplicate endpoint catalogue entity found. ID: ${endpoint.entityKey} - Type: ${endpoint.definition.type}`);
    } else {
      this.endpoints.set(endpoint.entityKey, endpoint);
    }
  }

  private registerEntity(entity: StratosCatalogueEntity) {
    if (this.entities.has(entity.entityKey)) {
      const { type } = entity.definition;
      console.warn(
        `Duplicate catalogue entity found. ID: ${entity.entityKey} - Type: ${type} - Endpoint: ${entity.definition.endpoint.type}`
      );
    } else {
      this.entities.set(entity.entityKey, entity);
    }
  }

  private getEntityOfType<T extends IEntityMetadata = IEntityMetadata, Y = any>(
    entityType: string,
    endpointType?: string
  ): StratosBaseCatalogueEntity {
    const id = endpointType ? this.getEntityKey(endpointType, entityType) : entityType;
    // STRATOS_ENDPOINT_TYPE is a special case for internal entities.
    if (endpointType !== STRATOS_ENDPOINT_TYPE && entityType === EntityCatalogueHelpers.endpointType) {
      return this.endpoints.get(id);
    }
    return this.entities.get(id) as StratosCatalogueEntity<T, Y>;
  }

  private getEntitySubType(entity: StratosBaseCatalogueEntity, subtypeType: string) {
    const subTypes = entity.definition.subTypes as IStratosBaseEntityDefinition[];
    if (!subTypes) {
      return null;
    }
    const subtype = subTypes.find(subType => subType.type === subtypeType);
    if (!subtype) {
      return null;
    }
    const definition = entity.definition;
    const {
      subTypes: omitted,
      ...parent
    } = definition;
    // Ensure the subtype inherits parent
    return new StratosBaseCatalogueEntity({
      ...parent,
      ...subtype
    }, { ...entity.builders });
  }

  private getConfig(
    endpointTypeOrConfig: string | EntityCatalogueEntityConfig,
    entityType?: string,
    subType?: string
  ): EntityCatalogueEntityConfig {
    const config = endpointTypeOrConfig as EntityCatalogueEntityConfig;
    if (!config) {
      return {
        endpointType: null,
        entityType: null,
        subType: null
      };
    }
    if (config && config.entityType) {
      return config;
    }
    return {
      endpointType: endpointTypeOrConfig as string,
      entityType,
      subType
    };
  }

  public register(entity: StratosBaseCatalogueEntity) {
    if (entity.isEndpoint) {
      this.registerEndpoint(entity as StratosCatalogueEndpointEntity);
    } else {
      // We could auto register endpoints found in entities
      this.registerEntity(entity as StratosCatalogueEntity);
    }
  }

  public getEntity<T extends IEntityMetadata = IEntityMetadata, Y = any>(
    entityConfig: EntityCatalogueEntityConfig
  ): StratosBaseCatalogueEntity;
  public getEntity<T extends IEntityMetadata = IEntityMetadata, Y = any>(
    endpointType: string,
    entityType: string,
    subType?: string
  ): StratosBaseCatalogueEntity;
  public getEntity<T extends IEntityMetadata = IEntityMetadata, Y = any>(
    endpointTypeOrConfig: string | EntityCatalogueEntityConfig,
    entityType?: string,
    subType?: string
  ): StratosBaseCatalogueEntity {
    const config = this.getConfig(endpointTypeOrConfig, entityType, subType);
    const entityOfType = this.getEntityOfType<T, Y>(config.entityType, config.endpointType);
    if (subType) {
      return this.getEntitySubType(entityOfType, subType);
    }
    return entityOfType;
  }

  public getEntityKey(endpointType: string, entityType: string): string;
  public getEntityKey(entityConfig: EntityCatalogueEntityConfig): string;
  public getEntityKey(endpointTypeOrConfig: string | EntityCatalogueEntityConfig, entityType?: string) {
    const config = this.getConfig(endpointTypeOrConfig, entityType);
    if (config && config.entityType) {
      return EntityCatalogueHelpers.buildEntityKey(config.entityType, config.endpointType);
    }
    return EntityCatalogueHelpers.buildEntityKey(entityType, endpointTypeOrConfig as string);
  }

  public getEndpoint(endpointType: string, subType?: string) {
    return this.getEntity(
      endpointType,
      EntityCatalogueHelpers.endpointType,
      subType
    ) as StratosCatalogueEndpointEntity;
  }

  public getAllEntitiesForEndpointType(endpointType: string) {
    return this.getAllEntitiesTypes().filter(entities => entities.definition.endpoint.type === endpointType);
  }

  public getAllEntitiesTypes() {
    return Array.from(this.entities.values());
  }

  public getAllBaseEndpointTypes() {
    return Array.from(this.endpoints.values());
  }

  public getAllEndpointTypes() {
    const baseEndpoints = Array.from(this.endpoints.values());
    return baseEndpoints.reduce((allEndpoints, baseEndpoint) => {
      allEndpoints.push(baseEndpoint);
      if (baseEndpoint.definition.subTypes) {
        baseEndpoint.definition.subTypes.forEach(subType => {
          allEndpoints.push(this.getEndpoint(baseEndpoint.definition.type, subType.type));
        });
      }
      return allEndpoints;
    }, [] as StratosCatalogueEndpointEntity[]);
  }

  public getAllEntityRequestDataReducers() {
    const entities = Array.from(this.entities.values());
    return entities.reduce((allEntityReducers, entity) => {
      if (entity.entityKey && entity.builders.dataReducers && entity.builders.dataReducers.length) {
        return {
          ...allEntityReducers,
          [entity.entityKey]: entity.builders.dataReducers
        };
      }
      return allEntityReducers;
    }, {} as ExtraApiReducers<IRequestEntityTypeState<any>>);
  }
}

// Only to be used for tests
export class TestEntityCatalogue extends EntityCatalogue { }

export const entityCatalogue = new EntityCatalogue();