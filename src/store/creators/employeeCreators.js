
import { createAsyncThunk } from '@reduxjs/toolkit';
import {
  fetchEmployeesApi,
  fetchEmployeeByIdApi,
  createEmployeeApi,
  updateEmployeeApi,
  deleteEmployeeApi,
} from '../../api/employees';


export const fetchEmployeesAsync = createAsyncThunk(
  'employees/fetchEmployees',
  async (params, { rejectWithValue }) => {
    try {
      const response = await fetchEmployeesApi(params);
      return response; 
    } catch (error) {
      return rejectWithValue(error);
    }
  }
);

export const fetchEmployeeByIdAsync = createAsyncThunk(
  'employees/fetchEmployeeById',
  async (employeeId, { rejectWithValue }) => {
    try {
      const employee = await fetchEmployeeByIdApi(employeeId);
      return employee;
    } catch (error) {
      return rejectWithValue(error);
    }
  }
);


export const createEmployeeAsync = createAsyncThunk(
  'employees/createEmployee',
  async (employeeData, { rejectWithValue }) => {
    try {
      const newEmployee = await createEmployeeApi(employeeData);
      console.log('New Employee Created:', newEmployee);
      
      return newEmployee;
    } catch (error) {
      return rejectWithValue(error);
    }
  }
);


export const updateEmployeeAsync = createAsyncThunk(
  'employees/updateEmployee',
  async ({ employeeId, updatedData }, { rejectWithValue }) => {
    try {
      const updatedEmployee = await updateEmployeeApi(employeeId, updatedData);
      return updatedEmployee;
    } catch (error) {
      return rejectWithValue(error);
    }
  }
);


export const deleteEmployeeAsync = createAsyncThunk(
  'employees/deleteEmployee',
  async (employeeId, { rejectWithValue }) => {
    try {
      await deleteEmployeeApi(employeeId);
      return employeeId; 
    } catch (error) {
      return rejectWithValue(error);
    }
  }
);