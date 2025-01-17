// axios 的封装处理
import axios from 'axios'
import {getToken} from './user-token'

// baseURL: 'http://47.236.96.190:8000',

// export const request = axios.create({
//     baseURL: 'http://localhost:8000',
//     timeout: 5000,
// })

// // 服务器版本
// export const request = axios.create({
//   baseURL: 'https://comorbidity.top/api',
//   timeout: 5000,
// })

// 服务器版本
export const request = axios.create({
  baseURL: 'http://127.0.0.1:8000/api',
  timeout: 5000,
})

// export const request = axios.create({
//     baseURL: 'https://sa5ni199260.vicp.fun:443',
//     timeout: 5000,
// })

// 添加请求拦截器
request.interceptors.request.use(config => {
    // 在发送请求之前做些什么
    config.headers.Authorization = `Bearer ${getToken()}`;
    return config;
  }, 
  error => Promise.reject(error)
  )
  
// 添加响应拦截器
request.interceptors.response.use(function (response) {
    // 对响应数据做点什么
    return response;
  },   
  error => Promise.reject(error)
)
