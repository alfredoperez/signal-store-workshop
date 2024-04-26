import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ProgressBarComponent } from '@/shared/ui/progress-bar.component';
import { AlbumFilterComponent } from './album-filter/album-filter.component';
import { AlbumListComponent } from './album-list/album-list.component';
import { AlbumSearchStore } from '@/albums/album-search/album-search.store';

@Component({
  selector: 'ngrx-album-search',
  standalone: true,
  imports: [ProgressBarComponent, AlbumFilterComponent, AlbumListComponent],
  providers: [AlbumSearchStore],
  template: `
    <ngrx-progress-bar [showProgress]="store.isPending()" />

    <div class="container">
      <h1>Albums ({{ store.totalAlbums() }})</h1>

      <ngrx-album-filter
        [query]="store.query()"
        [order]="store.order()"
        (queryChange)="store.updateQuery($event)"
        (orderChange)="store.updateOrder($event)"
      />

      <ngrx-album-list
        [albums]="store.filteredAlbums()"
        [showSpinner]="store.isPending()"
      />
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class AlbumSearchComponent {
  readonly store = inject(AlbumSearchStore);
}
