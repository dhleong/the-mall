Let's Go to The Mall
====================

**Where all the best Stores are**

## What?

The Mall is a global state management framework for React inspired by the
functional subscription semantics from [re-frame][1].

## The Cast

There are a handful of pieces to the Mall puzzle, each affecting the next in
a perpetual, harmonious loop.

### The Store

The `Store` maintains the current global app state, which is basically just a
big map. There's a singleton `Store` instance shared across the entire app,
and looks something like:

```typescript
export const myStore = new Store<IState>({
    ships: {},
});
```

This Store is provided to connected components using the `Provider`, like so:

```typescript
ReactDOM.render(
  <StoreProvider value={myStore}>
    <App />
  </StoreProvider>
, document.getElementById("root"));
```

You can ask the `Store` for a snapshot of its current state, but that's
tedious. It's much easier to let it tell us when the state we're interested
in has changed. We do that using Subcriptions.

### Subscriptions and References

A Subscription is a reactive component that takes some sort of input and
produces some sort of output. Subscriptions can subscribe to other
Subscriptions, only running when one of their inputs changes, and only
notifying subscribers when their computed value changes. This means you can
share Subscriptions across components and only compute the values once.

When you invoke a Subscription, which looks just like calling a function,
you get back a Reference to the data that Subscription computes. A Reference
can be dereferenced to get the current value. When you dereference a Reference
inside a Subscription or connected Component, that dependency is recorded and
when that Reference's value changes, the Subscription or Component that it
was dereferenced in will be notified automatically.

Let's take a look at how this works in practice:

```typescript
// this subscription pulls data directly from the Store, and so is called a
// "Level 1" subscription. Since the Store itself is a Reference, you can
// dereference it just like one you might get from a Subscription
const allShips = sub(
    // this is the subscription "compute" function, and is called whenever the
    // inputs, in this case the Store's state, changes.
    () => myStore.deref().ships
);

// subscriptions compute functions can of course accept arguments, just like
// any function. The resulting subscription object can be invoked with the same
// arguments, and they will be passed along as appropriate. This is commonly
// used to pick the data you want dynamically, based on some input (often,
// React Component props).
const shipById1 = sub((id: string) => {
    return myStore.deref().ships[id];
});
```

A subscription, as created by a `sub()` call like those above, is just a
function that takes the same arguments as the *subscription compute function*,
and produces a Reference. The subscription object itself has no real state, so
you can think it as the blueprint for a reference to the data—they aren't
*subscribed* to anything *yet*, but they know how to.

As mentioned above, subscriptions can subscribe to other subscriptions,
reducing the amount of code you need to write, and the amount of computation
browsers need to perform. Such subscriptions are called "Level 2"
subscriptions.

```typescript
// remember the Level 1 subscription allShips above? We can use it to
// simplify our shipById subscription. The benefit of doing this is that we
// can reuse allShips in other subscriptions (or components) and they will
// all share the same computation.
const shipById2 = sub((id: string) => {
    return allShips().deref()[id];
});
```

Now that you know how to tell the Mall what you want, it's time to use it to
render some HTML!

### Connected Components

When you subscribe to data at the Mall and use it to render HTML, you are
creating a Connected Component. The name doesn't matter all that much, but we
needed to call it *something*. Connected Components are just normal React
components that you've wrapped in the Higher-Order Component `connect()`.  By
*connecting* your components, you make them aware of any Subscriptions you
subscribe to (IE: References you dereference) during rendering, which causes
them to listen for changes to those values and automatically re-render.

Let's take a look:

```javascript
const ShipViewer = (id: string) => {

  // Just like in our subscriptions, we can invoke a subscription and deref
  // the returned Reference to get its current value.  By wrapping our
  // component in `connect()` below, if the value of `ship` should ever
  // change, our component will automatically re-render!
  const ship = shipById2(id).deref();
  if (!ship) {
    return (
      <div>Loading...</div>
    );
  }

  return (
    <div>
      <h3>{ship.name}</h3>
    </div>
  );
}
export default connect(ShipViewer);
```

This is all well and good, you might be thinking, but why does my component
only show "Loading"? How can I "change the value of the subscription" like you
keep saying? Well to do that, we have to `dispatch` an `Event` to modify the
`Store`.

### Events

As a frontend developer, you're probably very familiar with events. Tap events,
navigation events, lifecycle events—frontend is a very event-driven domain. At
the Mall, you can use these events to `dispatch()` capital-E `Events`, which
modify the Store's global state.

Events, like subscriptions, take some sort of input and produce some sort of
output. And, like subscriptions, are functions produced using a factory. Unlike
subscriptions, however, the shape of their output is generally the same as the
shape of their output:

```typescript
// the most basic event type is a "Store Event," which takes the current state
// of the Store, optionally some extra arguments, and returns a modified *copy*
// of the input state. It is an error to directly modify the input object,
// since otherwise Subscriptions won't know that anything has changed.
export const putShip = events.store((state: IState, ship: Ship) => {
    return {
        ...state,
        ships: {
            ...state.ships,

            [ship.id]: ship,
        },
    };
});
```

As you might expect, `putShip` above is a function that accepts a `Ship`, and
when called returns an `Event`. We can modify our previous component to make
use of this event and manually "load" a ship:

```typescript
const ShipViewer = (id: string) => {
  // useDispatch is a React Hook that provides you with the
  // dispatch function
  const dispatch = useDispatch<IState>();

  const ship = shipById2(id).deref();
  if (!ship) {
    return (
      <div>
        <h3>Loading...</h3>
        <div onClick={
          dispatch(putShip({
            id,
            name: "Serenity",
          }))
        }>Load Manually</a>
      </div>
    );
  }

  return (
    <div>
      <h3>{ship.name}</h3>
    </div>
  );
}
export default connect(ShipViewer);
```

When you click on `Load Manually`:

* An Event will get `dispatch()`'d to `MyStore`, where the compute function
  passed to `event.store()` will be called with the current state of the
  store and the Ship object we passed to `putShip`, and the Store's state
  will be updated.
* `MyStore` will notify the `allShips` subscription that it has changed
* `allShips` will pull out the `ships` key and, seeing that it has also
  changed, notify the `shipById2` subscription.
* `shipById2` will pull the appropriate ship out of its `allShips` Reference,
  see that it now exists, and notify the `ShipViewer`.
* `ShipViewer` will finally render again, using the changed `ship` value.

If you were to click on `Load Manually` again, only the first step would
happen—since the `ships` map has not changed, `allShips` will not have
changed, so the component doesn't need to re-render!

### Effect-ful Events

You can get a lot done with the basic `events.store`-type events, but at some
point you may need to cause more side-effects than simply updating the state
of the Store—like kicking off an Ajax request to load more data, for example.
Sure, you could just do it in an `events.store`-type event, but that makes
your event handler somewhat difficult to test, and also, in general, spinning
off side effects from things that are supposed to just purely update state
tends to lead to a death by a thousand cuts. So, what do we do? The answer
lies in Effects.

Effects are basically plain old functions that do things. The Mall provides a
handful of built-in Effects, such as one that updates the state of the Store,
or one that dispatches another event.  For example, we can rewrite
`putCampaign` as an Effect-ful event handler like this:

```typescript
// Effect-ful event handlers are necessarily a bit more complex than `store`
// functions, since they can do more!  In this case, instead of getting the old
// state as the first parameter, the old state is provided in the `state` key
// of a special new object. More on that later.
export const putShip = events.fx((fx: IFx<IStore>, ship: Ship) => {
    // The current state is provided as a key on the "effector,"
    // here called `fx`.
    const state = fx.state;

    // Instead of returning the new state, you provide it to the
    // `state` Effect via the "effector."
    fx.state(
        {
            ...state,
            ships: {
                ...state.ships,

                [ship.id]: ship,
            },
        }
    );
});
```

Probably, you will want more than just the default Effects, though. You might
imagine an `ajax` function that loads JSON from an URL and `dispatch()`'s an
event to store that data into the DB:

```typescript

export async function ajax(
    // all effect handlers can receive the Store instance as their first
    // argument. This is provided for you by the Mall when the effect is
    // produced by an event handler, in case you need to `.dispatch()` an
    // event, as here:
    store: IStore<IState>,

    // the parameters following the store instance are what you provide when
    // producing the effect in an event handler:
    url: string,
    key: string
) {
    const json = await loadJson(url);
    store.dispatch(setJsonValue(key, json));
};
```

Now to use this, you simply `produce()` it from your Effectful Event Handler:

```typescript
export const loadShip = events.fx((fx: IFx<IState>, id: string) => {
    // Note this special syntax. Instead of invoking the function directly,
    // let the Mall do it for you to keep your event handler pure! Simply
    // pass the effect handler as the first argument to `produce()`, and
    // any arguments (except for the optional IStore first argument) after.
    // The Mall is smart enough to provide the IStore instance for you if
    // (and only if!) you wanted it.
    fx.produce(ajax, `/ships/${id}`, keyForShip(id));
});
```

That's it! Your `loadShip` event can be used just like any other event:

```typescript
dispatch(loadShip("serenity"));
```

and can be tested without having to worry about the side effects (which can
themselves be tested in isolation in the usual way—they're just functions!):

```typescript
describe("loadShip", () => {
    it("requests AJAX load", () => {
        const fx = dispatchEffectful(loadShip("serenity"));
        fx.should.have.produced(ajax, "/ship/serenity", "$serenity");
    });
});
```

[1]: https://github.com/Day8/re-frame
