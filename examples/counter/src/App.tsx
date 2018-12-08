import React, { Component } from "react";

import { connect, sub, useDispatch, events } from "the-mall";

import "./App.css";
import logo from "./logo.svg";
import { ICounterState, counterStore } from "./store";

const countSub = sub(function countSub() {
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

const _CountFunction = () => (
  <p>
    Count in Functional Component = {countSub().deref()}
  </p>
);
const CountFunction = connect(_CountFunction);

const increment = events.store<ICounterState>(state => {
  return {
    ...state,
    count: state.count + 1,
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
          onClick={() => dispatch(increment())}
          value="Increment"
        />
      </header>
    </div>
  );
}
