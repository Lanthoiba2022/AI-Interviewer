import { configureStore } from '@reduxjs/toolkit';
import { combineReducers } from '@reduxjs/toolkit';
import storage from 'redux-persist/lib/storage';
import { persistReducer, persistStore } from 'redux-persist';
import interviewReducer from './slices/interviewSlice';
import candidatesReducer from './slices/candidatesSlice';

const rootReducer = combineReducers({
  interview: interviewReducer,
  candidates: candidatesReducer,
});

const persistConfig = {
  key: 'crisp_root',
  storage,
  whitelist: ['candidates', 'interview'],
};

const persistedReducer = persistReducer(persistConfig, rootReducer);

export const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['persist/PERSIST', 'persist/REHYDRATE'],
      },
    }),
});

export const persistor = persistStore(store);

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;