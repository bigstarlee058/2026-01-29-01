import axios from 'axios';
import { createSlice } from '@reduxjs/toolkit';
import persistReducer from 'redux-persist/es/persistReducer';
import storage from 'redux-persist/lib/storage';
import toast from 'react-hot-toast';
import { register, login, refreshUser, update } from './operations';

const clearAuthHeader = () => {
  axios.defaults.headers.common.Authorization = '';
};

const persistConfig = {
  key: 'user',
  storage,
  whitelist: ['token', 'user'],
};

const initialState = {
  user: {
    name: '',
    email: '',
    defaultRole: '',
    username: '',
    type: '',
    isPromptHidden: '',
  },
  token: '',
  error: false,
  isLoading: false,
  isLoggedIn: false,
  isRefreshing: true,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    clearError: state => {
      state.error = false;
    },
    logOut: state => {
      state.user = {
        name: '',
        email: '',
        defaultRole: '',
        username: '',
        type: '',
      };
      state.token = '';
      state.isLoggedIn = false;
      toast.success('Logout successful');
      clearAuthHeader();
    },
    logOutNoToast: state => {
      state.user = {
        name: '',
        email: '',
        defaultRole: '',
        username: '',
        type: '',
      };
      state.token = '';
      state.isLoggedIn = false;
      clearAuthHeader();
    },
  },
  extraReducers: builder => {
    builder
      .addCase(register.pending, state => {
        state.isLoading = true;
      })
      .addCase(register.fulfilled, (state, { payload }) => {
        state.user = {
          ...state.user,
          name: payload.name,
          email: payload.email,
          defaultRole: payload.defaultRole,
          username: payload.username,
          type: payload.type,
          isPromptHidden: payload.isPromptHidden,
        };
        state.token = payload.token;
        state.isLoggedIn = true;
        state.isLoading = false;
        state.error = false;
      })
      .addCase(register.rejected, state => {
        state.isLoading = false;
        state.error = true;
      })
      .addCase(login.pending, state => {
        state.isLoading = true;
      })
      .addCase(login.fulfilled, (state, { payload }) => {
        state.user = {
          ...state.user,
          username: payload.username,
          email: payload.email,
          type: payload.type,
          isPromptHidden: payload.isPromptHidden,
        };
        state.token = payload.token;
        state.isLoggedIn = true;
        state.isLoading = false;
        state.error = false;
      })
      .addCase(login.rejected, state => {
        state.isLoading = false;
        state.error = true;
      })
      .addCase(update.pending, state => {
        state.isLoading = true;
      })
      .addCase(update.fulfilled, (state, { payload }) => {
        state.user = { ...state.user, ...payload };
        state.token = payload.token;
        state.isLoading = false;
        state.error = false;
      })
      .addCase(update.rejected, state => {
        state.isLoading = false;
        state.error = true;
      })
      .addCase(refreshUser.pending, state => {
        state.isRefreshing = true;
      })
      .addCase(refreshUser.fulfilled, (state, { payload }) => {
        state.user = {
          ...state.user,
          username: payload.username,
          email: payload.email,
          type: payload.type,
          isPromptHidden: payload.isPromptHidden,
        };
        state.isLoggedIn = true;
        state.isRefreshing = false;
      })
      .addCase(refreshUser.rejected, state => {
        state.isRefreshing = false;
      });
  },
});

export const { clearError, logOut, logOutNoToast } = authSlice.actions;

export const authReducer = persistReducer(persistConfig, authSlice.reducer);
