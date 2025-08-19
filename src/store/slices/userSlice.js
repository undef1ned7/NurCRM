import { createSlice } from "@reduxjs/toolkit";

import {
  registerUserAsync,
  loginUserAsync,
  getIndustriesAsync,
  getSubscriptionPlansAsync,
  getCompany,
} from "../creators/userCreators";
import { useSelector } from "react-redux";

const initialState = {
  currentUser: null,
  isAuthenticated: false,
  loading: false,
  error: null,
  accessToken: localStorage.getItem("accessToken") || null,
  industries: [],
  subscriptionPlans: [],
  tariff: "",
  sector: "",
};

const userSlice = createSlice({
  name: "user",
  initialState,
  reducers: {
    logoutUser: (state) => {
      state.currentUser = null;
      state.isAuthenticated = false;
      state.loading = false;
      state.error = null;
      state.accessToken = null;
      localStorage.removeItem("accessToken");
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(registerUserAsync.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(registerUserAsync.fulfilled, (state, action) => {
        state.loading = false;
        // state.currentUser = action.payload;
        state.isAuthenticated = true;

        state.error = null;
      })
      .addCase(registerUserAsync.rejected, (state, action) => {
        state.loading = false;
        state.currentUser = null;
        state.isAuthenticated = false;
        state.error = action.payload;
      })

      .addCase(loginUserAsync.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(loginUserAsync.fulfilled, (state, action) => {
        state.loading = false;
        state.currentUser = action.payload.user || action.payload;
        state.isAuthenticated = true;
        if (action.payload.auth_token) {
          state.accessToken = action.payload.auth_token;
        }
        state.error = null;
      })
      .addCase(loginUserAsync.rejected, (state, action) => {
        state.loading = false;
        state.currentUser = null;
        state.isAuthenticated = false;
        state.accessToken = null;
        localStorage.removeItem("accessToken");
        state.error = action.payload;
      })
      .addCase(getIndustriesAsync.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getIndustriesAsync.fulfilled, (state, action) => {
        state.loading = false;
        state.industries = action.payload;
        state.error = null;
      })
      .addCase(getSubscriptionPlansAsync.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getSubscriptionPlansAsync.fulfilled, (state, action) => {
        state.loading = false;
        state.subscriptionPlans = action.payload;
        state.error = null;
      })
      .addCase(getCompany.pending, (state) => {
        state.loading = true;
      })
      .addCase(getCompany.fulfilled, (state, { payload }) => {
        state.loading = false;
        state.sector = payload?.sector?.name;
        state.tariff = payload?.subscription_plan?.name;
        // console.log(payload);

        state.subscriptionPlans = payload;
      })
      .addCase(getCompany.rejected, (state, { payload }) => {
        state.loading = false;
        state.error = payload;
      });
  },
});

export const { logoutUser } = userSlice.actions;
export const useUser = () => useSelector((state) => state.user);
export default userSlice.reducer;
