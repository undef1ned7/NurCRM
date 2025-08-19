// src/slices/departmentSlice.js
import { createSlice } from '@reduxjs/toolkit';
import { fetchDepartmentsAsync, fetchDepartmentByIdAsync } from '../creators/departmentCreators';

const initialState = {
  list: [],
  selected: null,
  loading: false,
  error: null,
};

const departmentSlice = createSlice({
  name: 'departments',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      // Fetch all
      .addCase(fetchDepartmentsAsync.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchDepartmentsAsync.fulfilled, (state, action) => {
        state.loading = false;
        state.list = action.payload;
      })
      .addCase(fetchDepartmentsAsync.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || 'Ошибка при получении отделов';
      })
      // Fetch by ID
      .addCase(fetchDepartmentByIdAsync.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchDepartmentByIdAsync.fulfilled, (state, action) => {
        state.loading = false;
        state.selected = action.payload;
      })
      .addCase(fetchDepartmentByIdAsync.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || 'Ошибка при получении отдела';
      });
  },
});

export default departmentSlice.reducer;
