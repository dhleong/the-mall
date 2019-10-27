import React from "react";

import { connect, sub, useDispatch, events } from "the-mall/macro";

import "./App.css";
import logo from "./logo.svg";
import { ICounterState, counterStore } from "./store";

const countSub = sub(() => {
  const root = counterStore.deref();
  return root.count;
});

class _CountComponent extends React.Component {
  render() {
    const count = countSub().deref();
    return (
      <p>
        Count in Component = {count}
      </p>
    );
  }
}
const CountComponent = connect(_CountComponent);

const CountFunction = connect(() => (
  <p>
    Count in Functional Component = {countSub().deref()}
  </p>
));
console.log(CountFunction.displayName);

const incrementBy = events.store((state: ICounterState, amount: number) => {
  return {
    ...state,
    count: state.count + amount,
  }
});


export default function App() {
  const dispatch = useDispatch<ICounterState>();

  return (
    <div className="App">
      <header className="App-header">
        <img src={logo} className="App-logo" alt="logo" />
        <p>
          Edit <code>src/App.tsx</code> and save to reload.
        </p>
        <CountFunction />
        <CountComponent />
        <input type="button"
          onClick={() => dispatch(incrementBy(1))}
          value="Increment"
        />
      </header>
    </div>
  );
}
