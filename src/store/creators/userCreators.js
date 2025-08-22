import { createAsyncThunk } from "@reduxjs/toolkit";
import {
  registerUser,
  loginUser,
  getIndustries,
  getSubscriptionPlans,
} from "../../api/auth";
import api from "../../api";
import axios from "axios";

export const registerUserAsync = createAsyncThunk(
  "user/register",
  async (props, { rejectWithValue }) => {
    try {
      const response = await registerUser(props.formData);
      // console.log(response);
      if (response.status) {
        props.navigate("/login");
      }

      return response;
    } catch (error) {
      return rejectWithValue(error);
    }
  }
);

export const loginUserAsync = createAsyncThunk(
  "user/login",
  async (props, { rejectWithValue }) => {
    try {
      const response = await loginUser(props.formData);
      if (response.access) {
        localStorage.setItem("accessToken", response.access);
        props.navigate("/crm/obzor/");
      }
      return response;
    } catch (error) {
      return rejectWithValue(error);
    }
  }
);

export const getIndustriesAsync = createAsyncThunk(
  "user/getIndustries",
  async (_, { rejectWithValue }) => {
    try {
      const response = await getIndustries();

      return response;
    } catch (error) {
      return rejectWithValue(error);
    }
  }
);

export const getSubscriptionPlansAsync = createAsyncThunk(
  "user/getSubscriptionPlans",
  async (_, { rejectWithValue }) => {
    try {
      const response = await getSubscriptionPlans();
      return response;
    } catch (error) {
      return rejectWithValue(error);
    }
  }
);

export const getCompany = createAsyncThunk(
  "user/fetchCompany",
  async (_, { rejectWithValue }) => {
    try {
      const { data } = await api.get("/users/company/", {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
        },
      });
      // console.log(data);
      return data;
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message);
    }
  }
);

export const SubmitApplicationAsync = createAsyncThunk(
  "user/submitApplication",
  async (applicationData, { rejectWithValue }) => {
    try {
      const response = await api.post("/users/applications/", applicationData);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message);
    }
  }
);
