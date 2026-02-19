import axios from "axios";

// Access environment variable or default to localhost
export const API_URL = process.env.REACT_APP_API_URL || "http://localhost:8000/api/v1";

export const api = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

export const endpoints = {
  gradeProject: "/grade-project",
  quiz: "/quiz",
  analyze: "/analyze",
};