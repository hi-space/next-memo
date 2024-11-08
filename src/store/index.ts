import { configureStore } from "@reduxjs/toolkit";
import memoReducer from "./memoSlice";

export const store = configureStore({
  reducer: {
    memos: memoReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
