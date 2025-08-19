import api from './index';

export const getIndustries = async () => {
  try {
    const response = await api.get('/users/industries/'); 
    return response.data.results;
  } catch (error) {
    return Promise.reject(error.response ? error.response.data : error.message);
  }
};

export const getSubscriptionPlans = async () => {
  try {
    const response = await api.get('/users/subscription-plans/'); 
    return response.data.results;
  } catch (error) {
    return Promise.reject(error.response ? error.response.data : error.message);
  }
};


export const registerUser = async (userData) => {
  try {
    const indt = await getIndustries()
    const subcrb = await getSubscriptionPlans()
    console.log('dasd', { ...userData });
    const response = await api.post('/users/auth/register/', { ...userData, });
    console.log(response,'res res res');
    


    return response;
  } catch (error) {
    return Promise.reject(error);
  }
};

export const loginUser = async (credentials) => {
  try {
    const response = await api.post('/users/auth/login/', credentials); 
    return response.data;
  } catch (error) {
    return Promise.reject(error.response ? error.response.data : error.message);
  }
};


