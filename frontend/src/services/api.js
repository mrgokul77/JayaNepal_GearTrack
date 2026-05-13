import axios from 'axios'

const api = axios.create({
  baseURL: 'http://localhost:5181/api',
  timeout: 10000,
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

/** Expired or invalid JWT: clear session so the user is not stuck with silent 401s on every request. */
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      const path = window.location?.pathname ?? ''
      if (!path.startsWith('/login') && !path.startsWith('/register')) {
        localStorage.removeItem('token')
        localStorage.removeItem('role')
        localStorage.removeItem('userId')
        localStorage.removeItem('fullName')
        localStorage.removeItem('email')
        window.location.assign('/login')
      }
    }
    return Promise.reject(error)
  },
)

export default api
