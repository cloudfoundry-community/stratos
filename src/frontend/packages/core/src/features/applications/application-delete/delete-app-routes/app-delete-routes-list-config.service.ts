import { Injectable } from '@angular/core';
import { Store } from '@ngrx/store';

import { ConfirmationDialogService } from '../../../../shared/components/confirmation-dialog.service';
import {
  CfAppRoutesListConfigService,
} from '../../../../shared/components/list/list-types/app-route/cf-app-routes-list-config.service';
import { ApplicationService } from '../../application.service';
import { APIResource } from '../../../../../../store/src/types/api.types';
import { ListView } from '../../../../../../store/src/actions/list.actions';
import { AppState } from '../../../../../../store/src/app-state';
import { GetAppRoutes } from '../../../../../../store/src/actions/application-service-routes.actions';
import { createEntityRelationKey } from '../../../../../../store/src/helpers/entity-relations/entity-relations.types';
import { routeSchemaKey, domainSchemaKey, applicationSchemaKey } from '../../../../../../store/src/helpers/entity-factory';
import { IRoute } from '../../../../core/cf-api.types';
import { Observable, of as observableOf } from 'rxjs';
import { RowState } from '../../../../shared/components/list/data-sources-controllers/list-data-source-types';

@Injectable()
export class AppDeleteRoutesListConfigService extends CfAppRoutesListConfigService {
  defaultView: ListView;
  constructor(
    store: Store<AppState>,
    appService: ApplicationService,
    confirmDialog: ConfirmationDialogService
  ) {
    super(store, appService, confirmDialog, new GetAppRoutes(appService.appGuid, appService.cfGuid, null, [
      createEntityRelationKey(routeSchemaKey, domainSchemaKey),
      createEntityRelationKey(routeSchemaKey, applicationSchemaKey),
    ]));
    this.getGlobalActions = () => null;
    this.getMultiActions = () => null;
    this.getSingleActions = () => null;
    this.allowSelection = true;
    this.routesDataSource.getRowState = (route: APIResource<IRoute>): Observable<RowState> =>
      observableOf({
        disabledReason: 'Route is attached to other applications',
        disabled: route && route.entity.apps ? route.entity.apps.length > 1 : false
      });
  }
}
