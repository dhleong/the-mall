import React, { useContext, useEffect, useState } from "react";

import { BaseSubContext, withContext } from "./context";
import { storeContext } from "./provider";

type Component<P> = React.ComponentClass<P> | React.FC<P>;

class ComponentContext extends BaseSubContext {

  setState?: (state: any) => any;

  displayName: string = "ComponentContext";

  private inRender = false;

  onDependenciesChanged(dependencies: any) {
    const setState = this.setState;
    if (!setState) {
      throw new Error(
        "Illegal State: no setState method attached but received onDependenciesChanged",
      );
    }

    setState(dependencies);
  }

  onEnter() {
    // see onEnter
    if (this.inRender) {
      super.onEnter();
    }
  }

  onExit() {
    // NOTE: the normal behavior here is to unsubscribe from
    // subscriptions we didn't visit between onEnter and now,
    // but when events are dispatched (IE: onDependenciesChanged)
    // we don't actually call the render function, so we don't
    // deref any references; instead, we wait until the render
    // happens (see performRender), during which we will do
    // the needful.
    if (this.inRender) {
      super.onExit();
    }
  }

  performRender<P>(
    renderFn: React.FC<P>,
    props: P,
  ): React.ReactElement<any> | null {
    this.inRender = true;
    const result = withContext(this, renderFn, props);
    this.inRender = false;
    return result;
  }

  toString(): string {
    return this.displayName;
  }
}

export function connect<P>(component: Component<P>): React.FC<P> {
  const Base = component;
  const context = new ComponentContext();

  // FIXME unfortunately, we probably need an actual HOC
  // if we're wrapping a class component
  // const renderFn = component.prototype.render
  //   ? function render(props: P) {
  //       return (
  //         <Base {...props} />
  //       );
  //     }
  //   : Base as React.FC<P>;
  if (component.prototype.render) {
    throw new Error("Class Components are not yet supported");
  }
  const renderFn = Base as React.FC<P>;

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

      // note [] so we don't get called constantly
      // this effect has no dependencies other than
      // the lifecycle of the component, so using []
      // means "don't call again until we're unmounted"
    }, []);

    return context.performRender(renderFn, props);
  };

  const compName = (component as any).name || component.displayName;
  hoc.displayName = `Connected${compName || "Component"}`;
  context.displayName = hoc.displayName + ".Context";
  return hoc;
}
