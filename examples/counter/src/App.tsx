import React, { Component } from "react";

import { connect, sub, useDispatch } from "the-mall";

import "./App.css";
import logo from "./logo.svg";
import { rootSub } from "./store";

const countSub = sub(() => {
  const root = rootSub().deref();
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

export default function App() {
  return (
    <div className="App">
      <header className="App-header">
        <img src={logo} className="App-logo" alt="logo" />
        <p>
          Edit <code>src/App.tsx</code> and save to reload.
        </p>
        <CountFunction />
        <CountComponent />
        <a
          className="App-link"
          href="https://reactjs.org"
          target="_blank"
          rel="noopener noreferrer"
        >
          Learn React
        </a>
      </header>
    </div>
  );
}
