import { createContext } from "react";

import { IStore } from "./model";

export const storeContext = createContext<IStore<any> | null>(null);
