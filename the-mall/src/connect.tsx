import React, { useContext, useEffect, useState } from "react";

import { BaseSubContext, withContext } from "./context";
import { storeContext } from "./provider";

type Component<P> = React.ComponentClass<P> | React.FC<P>;

class ComponentContext extends BaseSubContext {

  setState?: (state: any) => any;

  onDependenciesChanged(dependencies: any) {
    const setState = this.setState;
    if (!setState) {
      throw new Error(
        "Illegal State: no setState method attached but received onDependenciesChanged",
      );
    }

    setState(dependencies);
  }
}

export function connect<P>(component: Component<P>): React.FC<P> {
  const Base = component;
  const context = new ComponentContext();

  const renderFn = function render(props: P) {
    return (
      <Base {...props} />
    );
  };

  const hoc = function(props: P) {
    const [ , setState ] = useState(null);
    const store = useContext(storeContext);
    if (!store) throw new Error("No Store provided in Context");

    context.setState = setState;
    context.setStore(store);

    useEffect(() => {
      // we just useEffect so we can clean up nicely
      // when unmounted:
      return () => {
        // on unmount, unsubscribe from context
        context.dispose();
      };
    });

    return withContext(context, renderFn, props);
  };

  const compName = (component as any).name || component.displayName;
  hoc.displayName = `Connected${compName || "Component"}`;
  return hoc;
}
