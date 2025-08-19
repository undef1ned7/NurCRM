// src/creators/departmentCreators.js
import { createAsyncThunk } from '@reduxjs/toolkit';
import departmentAnalyticsApi from '../../api/departments';

export const fetchDepartmentsAsync = createAsyncThunk(
  'departments/fetchAll',
  async (_, thunkAPI) => {
    try {
      return await departmentAnalyticsApi.getDepartmentAnalytics();
    } catch (err) {
      return thunkAPI.rejectWithValue(err);
    }
  }
);

export const fetchDepartmentByIdAsync = createAsyncThunk(
  'departments/fetchById',
  async (id, thunkAPI) => {
    try {
      return await departmentAnalyticsApi.getDepartmentAnalytics(id);
    } catch (err) {
      return thunkAPI.rejectWithValue(err);
    }
  }
);
