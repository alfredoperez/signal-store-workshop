import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  OnInit,
} from '@angular/core';
import { ProgressBarComponent } from '@/shared/ui/progress-bar.component';
import { SortOrder } from '@/shared/models/sort-order.model';
import { Album, searchAlbums, sortAlbums } from '@/albums/album.model';
import { AlbumFilterComponent } from './album-filter/album-filter.component';
import { AlbumListComponent } from './album-list/album-list.component';
import { patchState, signalState } from '@ngrx/signals';
import { AlbumsService } from '@/albums/albums.service';
import { exhaustMap, lastValueFrom, pipe, tap } from 'rxjs';
import { MatSnackBar } from '@angular/material/snack-bar';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { tapResponse } from '@ngrx/operators';

@Component({
  selector: 'ngrx-album-search',
  standalone: true,
  imports: [ProgressBarComponent, AlbumFilterComponent, AlbumListComponent],
  template: `
    <ngrx-progress-bar [showProgress]="state.showProgress()" />

    <div class="container">
      <h1>Albums ({{ totalAlbums() }})</h1>

      <ngrx-album-filter
        [query]="state.query()"
        [order]="state.order()"
        (queryChange)="updateQuery($event)"
        (orderChange)="updateOrder($event)"
      />

      <ngrx-album-list
        [albums]="filteredAlbums()"
        [showSpinner]="showSpinner()"
      />
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class AlbumSearchComponent implements OnInit {
  readonly #albumsService = inject(AlbumsService);
  readonly #snackBar = inject(MatSnackBar);
  readonly state = signalState({
    albums: [] as Album[],
    showProgress: false,
    query: '',
    order: 'asc' as SortOrder,
  });

  readonly filteredAlbums = computed(() => {
    // return this.state
    //   .albums()
    //   .filter(
    //     (album) =>
    //       album.title
    //         .toLowerCase()
    //         .includes(this.state.query().toLowerCase()) ||
    //       album.artist.toLowerCase().includes(this.state.query().toLowerCase()),
    //   )
    //   .sort((a, b) => {
    //     const sort =
    //       this.state.order() === 'asc' ? a.title > b.title : a.title < b.title;
    //     return sort ? 1 : -1;
    //   });

    const searchedAlbums = searchAlbums(
      this.state.albums(),
      this.state.query(),
    );
    return sortAlbums(searchedAlbums, this.state.order());
  });

  readonly totalAlbums = computed(() => this.state.albums().length);

  readonly showSpinner = computed(
    () => this.state.showProgress() && this.totalAlbums() === 0,
  );

  readonly loadAllAlbums = rxMethod<void>(
    pipe(
      tap(() => patchState(this.state, { showProgress: true })),
      exhaustMap(() =>
        this.#albumsService.getAll().pipe(
          tapResponse({
            next: (albums) =>
              patchState(this.state, { albums, showProgress: false }),
            error: (error: { message: string }) => {
              this.#snackBar.open(error.message, 'Close', { duration: 5_000 });
              patchState(this.state, { showProgress: false });
            },
          }),
        ),
      ),
    ),
  );

  ngOnInit() {
    this.loadAllAlbums();
  }

  updateQuery(query: string): void {
    patchState(this.state, { query });
  }

  updateOrder(order: SortOrder): void {
    patchState(this.state, { order });
  }

  // private async loadAllAlbums() {
  //   // patchState(this.state, { showProgress: true });
  //   // try {
  //   //   const albums = await lastValueFrom(this.#albumService.getAll());
  //   //   patchState(this.state, { albums });
  //   // } catch (error) {
  //   //   this.#snackBar.open((error as Error).message, 'Close', {
  //   //     duration: 5_000,
  //   //   });
  //   // } finally {
  //   //   patchState(this.state, { showProgress: false });
  //   // }
  //
  //   patchState(this.state, { showProgress: true });
  //
  //   this.#albumsService.getAll().subscribe({
  //     next: (albums) => {
  //       patchState(this.state, { albums, showProgress: false });
  //     },
  //     error: (error: { message: string }) => {
  //       this.#snackBar.open(error.message, 'Close', { duration: 5_000 });
  //       patchState(this.state, { showProgress: false });
  //     },
  //   });
  // }
}
