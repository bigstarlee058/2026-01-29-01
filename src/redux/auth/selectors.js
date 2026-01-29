export const isLoggedIn = state => state.auth.isLoggedIn;

export const isRefresh = state => state.auth.isRefreshing;

export const isLoading = state => state.auth.isLoading;

export const user = state => state.auth.user;

export const token = state => state.auth.token;

export const authError = state => state.auth.error;
