import axios from "axios";

const BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8000/api";
const api = axios.create({ baseURL: BASE_URL });

export async function getAllPemda() {
  const { data } = await api.get("/pemda");
  return data;
}

export async function getPemdaDetail(namaPemda) {
  const { data } = await api.get(`/pemda/${encodeURIComponent(namaPemda)}`);
  return data;
}

export async function getClusterInfo() {
  const { data } = await api.get("/cluster");
  return data;
}

export async function getPerbandingan() {
  const { data } = await api.get("/perbandingan");
  return data;
}

export async function getRekomendasi(payload) {
  const { data } = await api.post("/rekomendasi", payload);
  return data;
}

export async function runSimulasi(payload) {
  const { data } = await api.post("/simulasi", payload);
  return data;
}

export default api;
