## Signals

```ts
import {computed, signal} from "@angular/core";

const count = signal(0)

console.log(count())  //0

count.set(10);

console.log(count()) //10
console.log(count())  //0

count.set((val) => val + 1);
console.log(count()) //11

// ----
const doubleCount = computed(() => {
    return count() * 2
})

console.log(doubleCount()) // 22
```

- Computed only updates when is executed.
- values are memoized

```ts


const doubleCount = computed(() => {
    return count() * 2
});

effect(() => {
    console.log(count())
})

count.set(11) // 22
```

- The `effect` will be attached to all the signals inside
- `effect` needs to be executed whiting the injection context, so they can be set in the constructor

 ```ts
import {Injector} from "@angular/core";

readonly
injector = inject(Injector
)

onButtonClick()
{
    effect(() => {
        console.log(count())
    }, {injector: this.injector})
}
```

- you can use the injector as a way to not declare effects in the constructor
- `effect` are executed in the next tick. This is not the same as `combineLatest`

---

## Signal State

```ts

type UserState = { user: User; isAdmin: boolean };
const userState = signalState<UserState>({
    user: {firstName: 'Eric', lastName: 'Clapton'},
    isAdmin: false,
}); // type: SignalState<UserState>

console.log(userState()); // logs the initial state

const user = userState.user; // type: DeepSignal<User>

console.log(user()); // logs: { firstName: 'Eric', lastName: 'Clapton' }
```

- `signalState` create `DeepSignal` for each prop in the state
    - All the states are created lazily on demand. they are only created when they are getting accessed

```ts
 type UserState = { user: User; isAdmin: boolean };
const userState = signalState<UserState>({
    user: {firstName: 'Eric', lastName: 'Clapton'},
    isAdmin: false,
}); // type: SignalState<UserState>


patchState(userState, {isAdmin: true})  // partial state object, only in the first level

// partial state updater
patchState(userState, (state) => ({
    user: {...state.user, firstName: 'Jimi'},
}));

// a sequence of partial state objects and/or updaters
patchState(
    userState,
    {isAdmin: false},
    (state) => ({user: {...state.user, lastName: 'Hendrix'}})
);

```

### Custom State Updaters

Here an example of `setFirstName` and `setAdmin`

```ts
const userState = signalState<UserState>({
    user: {firstName: 'Eric', lastName: 'Clapton'},
    isAdmin: false,
});

function setFirstName(
    firstName: string
): PartialStateUpdater<{ user: User }> {
    return (state) => ({user: {...state.user, firstName}});
}

const setAdmin = () => ({isAdmin: true});


patchState(
    userState,
    setFirstName('Stevie'),
    setAdmin()
);

```

- Testing is easier because it is a pure functions
- Also this is good because it is re-usable, you can create custom updaters, and re-use in other `patchState`

- You can use the new way to define input and outputs

```ts
import {EventEmitter} from "@angular/core";

@Input()
query;
readonly
query = input('');

@Outpu()
readonly
querychange = new EventEmitter<boolean>();
queryChange = output<string>()
```

- Now with `model` you can do two-way data binding

```ts
readonly
query = model('');
readonly
order = model<SortOrder>('asc');
```

- with this they can also comunnicate to the parent


- In container component, it might be good to use as input `[query]="query"`and `(queryChange)="updateQuery($event)"`


- 💡 Use the `as ` to not have to define a type and still make it type

```ts
  readonly
state = signalState<AlbumSearchState>({
    albums: [] as Album[],
    showProgress: false,
    query: '',
    order: 'asc' as SortOrder,
});
```

## RxMethod

A standalone factory function designed for managing side effects by utilizing RxJS APIs. It takes a chain of RxJS
operators as input and returns a reactive method.

```ts
@Component({ /* ... */})
export class NumbersComponent implements OnInit {

    readonly logDoubledNumber = rxMethod<number>(
        pipe(
            map((num) => num * 2),
            tap((doubledNum) => console.log(doubledNum)),
        ),
    );


    ngOnInit(): void {
        this.logDoubledNumber(1);
        // console output: 2

        const num$ = interval(2_000);
        this.logDoubledNumber(num$);
        // console output: 0, 2, 4, 6... every 2 seconds

        const num = signal(100);
        this.logDoubledNumber(num);
        // console output: 200

        num.set(200);
        // console output: 400
    }
}
```

- `rxMethod` needs to be also defined in the injection context, since it hast to be clean up

- 💡 define dependencies at the beginning
- 💡 Use the `tapResponse` operator from the `@ngrx/operators` package to keep the reactive method subscription alive if
  the request fails.
- 💡 Use `exhaustMap` to prevent parallel calls when the reactive method is called multiple times.

## Signal Store

```ts
type TodosState = { todos: Todo[] };

const TodosStore = signalStore(
    withState<TodosState>({todos: []}),
    withComputed(({todos}) => ({
        completedTodos: computed(() =>
            todos().filter((todo) => todo.completed)
        ),
    })),
    withMethods((store) => ({
        addTodo(todo: Todo): void {
            patchState(store, {
                todos: [...store.todos(), todo],
            });
        },
    }))
);

```

- SignalStore return an injectable and you can provide at the component level


- Lifecycle hooks

```ts
 withHooks(({todos}) => ({
    onInit() {
        console.log('todos on init', todos());
    },
    onDestroy() {
        console.log('todos on destroy', todos());
    },
}))

```

### Limitations of class-based approach

- **Typing**: It’s not possible to define dynamic class properties or methods that are strongly typed.

```ts
@Injectable()
export class BooksStore extends ComponentStore<BooksState> {


    readonly filteredBooks = this.selectSignal(
        this.books,
❌
    this
.
    query
, ❌
(
    books
,
    query
) =>
    books
.

    filter(

( {
    title
}

) =>
title.includes(query)
),
)
;

constructor()
{
    super({books: [], query: '', isPending: false});
}
}
```

- **Tree-shaking**: Unused class methods and properties won’t be removed from the final bundle.

- **Extensibility**: Multiple inheritance is not supported.
- **Modularity**: Splitting selectors, updaters, and effects into different classes is possible, but not provided out of
  the box.
    - This not the way the store it is used

---

`withMethods` to create updaters or side-effects
`withHooks` only to trigger on initializing

## Custom Features

```ts
export type RequestStatus = 'idle' | 'pending' | 'fulfilled' | { error: string };

export type RequestStatusState = { requestStatus: RequestStatus };

export function withRequestStatus() {
    return signalStoreFeature(
        withState<RequestStatusState>({requestStatus: 'idle'}),
        withComputed(({requestStatus}) => ({
            isPending: computed(() => requestStatus() === 'pending'),
            isFulfilled: computed(() => requestStatus() === 'fulfilled'),
            error: computed(() => {
                const status = requestStatus();
                return typeof status === 'object' ? status.error : null;
            }),
        })),
    );
}

```

Then to use it

```ts
export const BooksStore = signalStore(
    withState({books: [] as Book[]}),
    withRequestStatus(),
    withMethods((store, booksService = inject(BooksService)) => ({
        async loadAll() {
            patchState(store, setPending()); ✅

        const books = await booksService.getAll();
            patchState(store, {books}, setFulfilled());✅
        },
    })),
);

```
