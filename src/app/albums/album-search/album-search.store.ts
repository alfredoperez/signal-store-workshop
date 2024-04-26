import {
  patchState,
  signalStore,
  withComputed,
  withHooks,
  withMethods,
  withState,
} from '@ngrx/signals';
import { Album, searchAlbums, sortAlbums } from '@/albums/album.model';
import { SortOrder, toSortOrder } from '@/shared/models/sort-order.model';
import { computed, inject } from '@angular/core';
import { AlbumsService } from '@/albums/albums.service';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { exhaustMap, filter, pipe, tap } from 'rxjs';
import { tapResponse } from '@ngrx/operators';
import { MatSnackBar } from '@angular/material/snack-bar';
import {
  setError,
  setFulfilled,
  setPending,
  withRequestStatus,
} from '@/shared/state/request-status.feature';
import { setAllEntities, withEntities } from '@ngrx/signals/entities';
import { withQueryParams } from '@/shared/state/route/query-params.feature';

type AlbumSearchState = {
  query: string;
  order: SortOrder;
};

const initialState: AlbumSearchState = {
  query: '',
  order: 'asc',
};

export const AlbumSearchStore = signalStore(
  withState(initialState),
  withRequestStatus(),
  withEntities<Album>(),
  withQueryParams({
    query: (val) => val ?? '',
    order: toSortOrder,
  }),
  withComputed(({ entities: albums, query, order, isPending }) => {
    const filteredAlbums = computed(() => {
      const searchedAlbums = searchAlbums(albums(), query());
      return sortAlbums(searchedAlbums, order());
    });
    const totalAlbums = computed(() => albums().length);
    const showSpinner = computed(() => isPending() && totalAlbums() === 0);

    return {
      filteredAlbums,
      totalAlbums,
      showSpinner,
    };
  }),
  withMethods(
    (
      store,
      albumsService = inject(AlbumsService),
      snackBar = inject(MatSnackBar),
    ) => ({
      loadAllAlbums: rxMethod<void>(
        pipe(
          tap(() => setPending()),
          exhaustMap(() =>
            albumsService.getAll().pipe(
              tapResponse({
                next: (albums) =>
                  patchState(store, setAllEntities(albums), setFulfilled()),
                error: (error: { message: string }) =>
                  patchState(store, setError(error.message)),
              }),
            ),
          ),
        ),
      ),
      notifyOnError: rxMethod<string | null>(
        pipe(
          filter(Boolean),
          tap((error) => snackBar.open(error, 'Close', { duration: 5_000 })),
        ),
      ),
    }),
  ),
  withHooks({
    onInit: ({ loadAllAlbums, notifyOnError, error }) => {
      loadAllAlbums();
      notifyOnError(error);
    },
  }),
);
