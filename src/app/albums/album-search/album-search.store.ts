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
import { exhaustMap, pipe, tap } from 'rxjs';
import { tapResponse } from '@ngrx/operators';
import { MatSnackBar } from '@angular/material/snack-bar';

type AlbumSearchState = {
  albums: Album[];
  showProgress: boolean;
  query: string;
  order: SortOrder;
};

const initialState: AlbumSearchState = {
  albums: [],
  showProgress: false,
  query: '',
  order: 'asc',
};

export const AlbumSearchStore = signalStore(
  withState(initialState),
  withComputed(({ albums, query, order, showProgress }) => {
    const filteredAlbums = computed(() => {
      const searchedAlbums = searchAlbums(albums(), query());
      return sortAlbums(searchedAlbums, order());
    });
    const totalAlbums = computed(() => albums().length);
    const showSpinner = computed(() => showProgress() && totalAlbums() === 0);

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
          tap(() => patchState(store, { showProgress: true })),
          exhaustMap(() =>
            albumsService.getAll().pipe(
              tapResponse({
                next: (albums) =>
                  patchState(store, { albums, showProgress: false }),
                error: (error: { message: string }) => {
                  snackBar.open(error.message, 'Close', { duration: 5_000 });
                  patchState(store, { showProgress: false });
                },
              }),
            ),
          ),
        ),
      ),
    }),
  ),
  withHooks({
    onInit: ({ loadAllAlbums }) => {
      loadAllAlbums();
    },
  }),
);
