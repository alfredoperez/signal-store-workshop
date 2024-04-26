import {
  patchState,
  signalStore,
  withComputed,
  withHooks,
  withMethods,
  withState,
} from '@ngrx/signals';
import { Album, searchAlbums, sortAlbums } from '@/albums/album.model';
import { SortOrder } from '@/shared/models/sort-order.model';
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

type AlbumSearchState = {
  albums: Album[];

  query: string;
  order: SortOrder;
};

const initialState: AlbumSearchState = {
  albums: [],

  query: '',
  order: 'asc',
};

export const AlbumSearchStore = signalStore(
  withState(initialState),
  withRequestStatus(),
  withComputed(({ albums, query, order, isPending }) => {
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
      updateQuery(query: string) {
        patchState(store, { query });
      },
      updateOrder(order: SortOrder) {
        patchState(store, { order });
      },
      loadAllAlbums: rxMethod<void>(
        pipe(
          tap(() => setPending()),
          exhaustMap(() =>
            albumsService.getAll().pipe(
              tapResponse({
                next: (albums) => patchState(store, { albums }, setFulfilled()),
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
