import { Type } from '@angular/core';
import { ActionState, defaultClientPaginationPageSize, ListView } from '@stratosui/store';
import moment from 'moment';
import { BehaviorSubject, combineLatest, Observable, of as observableOf } from 'rxjs';
import { filter, first, map, startWith, switchMap } from 'rxjs/operators';

import { ITimeRange } from '../../services/metrics-range-selector.types';
import { ListDataSource } from './data-sources-controllers/list-data-source';
import { IListDataSource } from './data-sources-controllers/list-data-source-types';
import { CardTypes } from './list-cards/card/card.component';
import { ITableColumn, ITableText } from './list-table/table.types';
import { CardCell } from './list.types';

export enum ListViewTypes {
  CARD_ONLY = 'cardOnly',
  TABLE_ONLY = 'tableOnly',
  BOTH = 'both'
}

export interface IListConfig<T> {
  /**
   * List of actions that are presented as individual buttons and applies to general activities surrounding the list (not specific to rows).
   * For example `Add`
   */
  getGlobalActions: () => IGlobalListAction<T>[];
  /**
   * List of actions that are presented as individual buttons when one or more rows are selected. For example `Delete` of selected rows.
   */
  getMultiActions: () => IMultiListAction<T>[];
  /**
   * List of actions that are presented in a mat-menu for an individual entity. For example `unmap` an application route
   */
  getSingleActions: () => IListAction<T>[];
  /**
   * Collection of column definitions to show when the list is in table mode
   */
  getColumns: () => ITableColumn<T>[];
  /**
   * The data source used to provide list entries. This will be custom per data type
   */
  getDataSource: () => IListDataSource<T>;
  /**
   * Collection of configuration objects to support multiple drops downs for filtering local lists. For example the application wall filters
   * by cloud foundry, organization and space. This mechanism supports only the showing and storing of such filters. An additional function
   * to the data sources transformEntities collection should be used to apply these custom settings to the data.
   */
  getMultiFiltersConfigs: () => IListMultiFilterConfig[];
  /**
   * Collection of filter definitions to support filtering across multiple fields in a list.
   * When the filter is selected in a dropdown the filterString filters results using the chosen field.
   * Combined with a transformEntities DataFunction that consumes the filterKey.
   */
  getFilters?: () => IListFilter[];
  /**
   * Fetch an observable that will emit once the underlying config components have been created. For instance if the data source requires
   * something from the store which requires an async call
   */
  getInitialised?: () => Observable<boolean>;
  /**
   * A collection of numbers used to define how many entries per page should be shown. If missing a default will be used per table view type
   */
  pageSizeOptions?: number[];
  /**
   * What different views the user can select (table/cards)
   */
  viewType: ListViewTypes;
  /**
   * What is the initial view that the list will be displayed as (table/cards)
   */
  defaultView?: ListView;
  /**
   * Override the default list text
   */
  text?: ITableText;
  /**
   * Enable a few text filter... other config required
   */
  enableTextFilter?: boolean;
  /**
   * Set a custom value for the minimum height of a table row
   */
  minRowHeight?: string;
  /**
   * Set the align-self of each cell in the row
   */
  tableRowAlignSelf?: string;
  /**
   * The card component used in card view
   */
  cardComponent?: CardTypes<T>;
  /**
   * The component to show when expanding a row
   */
  expandComponent?: ListExpandedComponentType<T>;
  /**
   * Set to true to hide the list refresh button
   */
  hideRefresh?: boolean;
  /**
   * Allow selection regardless of number or visibility of multi actions
   */
  allowSelection?: boolean;
  /**
   * For metrics based data show a metrics range selector
   */
  showCustomTime?: boolean;
  /**
   * Custom time window to show in metrics range selector
   */
  customTimeWindows?: ITimeRange[];
  /**
   * Custom time window validation for metrics range selector
   */
  customTimeValidation?: (start: moment.Moment, end: moment.Moment) => string;
  /**
   * Custom time polling interval. Falsy for disabled.
   */
  customTimePollingInterval?: number;
  /**
   * When enabled set the initial value
   */
  customTimeInitialValue?: string;
}

// Simple list config does not need getDataSource
export type ISimpleListConfig<T> = Omit<IListConfig<T>, 'getDataSource'>;

export interface IListMultiFilterConfig {
  key: string;
  label: string;
  allLabel?: string;
  hideAllOption?: boolean;
  list$: Observable<IListMultiFilterConfigItem[]>;
  loading$: Observable<boolean>;
  select: BehaviorSubject<any>;
  autoSelectFirst?: boolean;
}

export interface IListFilter {
  default?: boolean;
  key: string;
  label: string;
  placeholder: string;
}

export interface IListMultiFilterConfigItem {
  label: string;
  item: any;
  value: string;
}

export const defaultPaginationPageSizeOptionsCards = [defaultClientPaginationPageSize, 30, 80];
export const defaultPaginationPageSizeOptionsTable = [defaultClientPaginationPageSize, 20, 80];

export class ListConfig<T, A = T> implements IListConfig<T> {
  isLocal = false;
  pageSizeOptions = defaultPaginationPageSizeOptionsCards;
  viewType = ListViewTypes.BOTH;
  text: ITableText = null;
  enableTextFilter = false;
  cardComponent = null;
  defaultView = 'table' as ListView;
  allowSelection = false;
  getGlobalActions = (): IGlobalListAction<T>[] => null;
  getMultiActions = (): IMultiListAction<T>[] => null;
  getSingleActions = (): IListAction<T>[] => null;
  getColumns = (): ITableColumn<T>[] => null;
  getDataSource = (): ListDataSource<T, A> => null;
  getMultiFiltersConfigs = (): IListMultiFilterConfig[] => [];
  getFilters = (): IListFilter[] => [];
  getInitialised = () => observableOf(true);
}

export interface IBaseListAction<T> {
  icon?: string;
  label: string;
  description?: string;
}

export interface IListAction<T> extends IBaseListAction<T> {
  action: (item: T) => void;
  createVisible?: (row$: Observable<T>) => Observable<boolean>;
  createEnabled?: (row$: Observable<T>) => Observable<boolean>;
}

export interface IOptionalAction<T> extends IBaseListAction<T> {
  visible$?: Observable<boolean>;
  enabled$?: Observable<boolean>;
}

export interface IMultiListAction<T> extends IOptionalAction<T> {
  /**
   * Return true if the selection should be cleared
   */
  action: (items?: T[]) => boolean | Observable<ActionState>;
}

export interface IGlobalListAction<T> extends IOptionalAction<T> {
  action: () => void;
}

export class MultiFilterManager<T> {
  public filterIsReady$: Observable<boolean>;
  public filterItems$: Observable<IListMultiFilterConfigItem[]>;
  public hasItems$: Observable<boolean>;
  public hasOneOrLessItems$: Observable<boolean>;
  public value: string;

  public filterKey: string;
  public allLabel: string;
  public hideAllOption = false;

  constructor(
    public multiFilterConfig: IListMultiFilterConfig,
    dataSource: IListDataSource<T>,
  ) {
    this.filterKey = this.multiFilterConfig.key;
    this.allLabel = multiFilterConfig.allLabel || 'All';
    this.hideAllOption = multiFilterConfig.hideAllOption || false;
    this.filterItems$ = this.getItemObservable(multiFilterConfig);
    this.hasOneOrLessItems$ = this.filterItems$.pipe(map(items => items.length <= 1));
    this.hasItems$ = this.filterItems$.pipe(map(items => !!items.length));
    this.filterIsReady$ = this.getReadyObservable(multiFilterConfig, dataSource, this.hasItems$);

    // Also select the first option if configured
    if (multiFilterConfig.autoSelectFirst) {
      this.filterItems$.pipe(first()).subscribe(options => {
        if (options && options.length > 0) {
          this.selectItem(options[0].value);
        }
      });
    }
  }

  private getReadyObservable(
    multiFilterConfig: IListMultiFilterConfig,
    dataSource: IListDataSource<T>,
    hasItems$: Observable<boolean>
  ) {
    return combineLatest(
      dataSource.isLoadingPage$,
      multiFilterConfig.loading$,
      hasItems$,
    ).pipe(
      map(([fetchingListPage, fetchingFilter, hasItems]) => (!fetchingListPage && !fetchingFilter) && hasItems),
      startWith(false)
    );
  }

  private getItemObservable(multiFilterConfig: IListMultiFilterConfig) {
    return multiFilterConfig.list$.pipe(
      map(list => list ? list : [])
    );
  }

  public applyValue(multiFilters: {}) {
    this.selectItem(multiFilters[this.multiFilterConfig.key]);

  }

  public hasValue(multiFilters: {}): boolean {
    return !!multiFilters[this.multiFilterConfig.key];
  }

  public selectItem(itemValue: string) {
    this.multiFilterConfig.loading$.pipe(
      filter(ready => !ready),
      switchMap(() => this.filterItems$),
      first(),
    ).subscribe(items => {
      // Ensure we actually have the item. Could be from storage and invalid
      if (itemValue === undefined || items.find(i => i.value === itemValue)) {
        this.value = itemValue;
        this.multiFilterConfig.select.next(itemValue);
      }
    });
  }
}

export type ListExpandedComponentType<T> = Type<CardCell<T>>;
