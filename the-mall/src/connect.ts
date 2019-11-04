import React, { useContext, useDebugValue, useEffect, useState } from "react";

import { BaseSubContext, withContext } from "./context";
import { IStore } from "./model";
import { storeContext } from "./provider";

type Component<P> = React.ComponentClass<P> | React.FC<P>;

class ComponentContext extends BaseSubContext {

    setState?: (state: any) => any;

    displayName: string = "ComponentContext";

    private inRender = false;
    private lastState = 0;

    onDependenciesChanged() {
        const setState = this.setState;
        if (!setState) {
            throw new Error(
                "Illegal State: no setState method attached but received onDependenciesChanged",
            );
        }

        const nextState = (this.lastState + 1) % 100;
        this.lastState = nextState;
        if (process.env.NODE_ENV !== "production") {
            setState({ step: nextState, refs: this.describeState() });
        } else {
            setState(nextState);
        }
        this.dispatchChangesBatched();
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
        useDebugValue(renderFn.name || renderFn.displayName);

        this.inRender = true;
        const result = withContext(this, renderFn, props);
        this.inRender = false;
        return result;
    }

    toString(): string {
        return this.displayName;
    }
}

function nameFrom<P>(
    Base: Component<P>,
    hoc: Component<P>,
    context: ComponentContext,
) {
    if (!hoc.displayName) {
        const compName = (Base as any).name || Base.displayName;
        hoc.displayName = `Connected${compName || "Component"}`;
    }
    context.displayName = hoc.displayName + ".Context";
}

function connectClass<P>(Base: React.ComponentClass<P>): React.ComponentClass<P> {
    const context = new ComponentContext();

    const hoc = class extends Base {
        static contextType = storeContext;

        componentDidMount() {
            context.setState = (state) => {
                this.setState({ __mall: state });
            };
        }

        componentWillUnmount() {
            context.dispose();
        }

        render() {
            const store = this.context as IStore<any>;
            if (!store) throw new Error("No Store provided in Context");
            context.setStore(store);

            return withContext(context, super.render);
        }
    };

    nameFrom(Base, hoc, context);
    return hoc;
}

function connectFunctional<P>(renderFn: React.FC<P>): Component<P> {
    const context = new ComponentContext();

    const hoc: React.FC<P> = function ConnectedHOC(props: P) {
        const store = useContext(storeContext);
        if (!store) throw new Error("No Store provided in Context");

        const [ , setState ] = useState({ __mall: null } as { __mall: any});
        context.setStore(store);

        if (!context.setState) {
            // ONLY use the first setState fn we get; React devtools seems
            // to do something to break setState, and in normal use the fn
            // should be memoized anyway.
            context.setState = setState;
        }

        useEffect(() => {
            // NOTE: we do this deferred, in the effect, in case you're
            // using the macro to inject the displayName
            if (!renderFn.name && !renderFn.displayName && hoc.displayName) {
                renderFn.displayName = hoc.displayName.replace("Connected", "");
            }

            // we just useEffect so we can clean up nicely when unmounted:
            return () => {
                // on unmount, unsubscribe from context
                context.dispose();
            };

            // NOTE the use of [] so we don't get called constantly.
            // this effect has no dependencies other than the lifecycle of the
            // component, so using [] means "don't call again until we're
            // unmounted"
            }, []);

        return context.performRender(renderFn, props);
    };

    nameFrom(renderFn, hoc, context);
    return hoc;
}

export function connect<P>(component: Component<P>): Component<P> {
    // unfortunately, we probably need to create an actual HOC if we're
    // wrapping a class component:
    if (component.prototype && component.prototype.render) {
        return connectClass(component as React.ComponentClass<P>);
    }

    const renderFn = component as React.FC<P>;
    return connectFunctional(renderFn);
}
