/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Student } from '../types';

// Tạo một vector đặc trưng (Face Embedding) mô phỏng gồm 128 số thực dựa trên thông tin học sinh hoặc ngẫu nhiên có hạt giống
export function generateMockEmbedding(name: string): number[] {
  const embedding: number[] = [];
  let seed = 0;
  for (let i = 0; i < name.length; i++) {
    seed += name.charCodeAt(i);
  }

  // Thuật toán sinh số giả ngẫu nhiên có hạt giống để embedding đồng nhất cho cùng một học sinh
  for (let i = 0; i < 128; i++) {
    const x = Math.sin(seed + i) * 10000;
    embedding.push(parseFloat((x - Math.floor(x)).toFixed(6)));
  }

  // Chuẩn hóa vector về độ dài bằng 1 (Unit Vector) để tính Cosine Similarity dễ dàng
  const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
  return embedding.map(val => val / (magnitude || 1));
}

// Tính khoảng cách Euclidean hoặc Cosine Similarity giữa hai vector embedding
export function calculateSimilarity(emb1: number[], emb2: number[]): number {
  if (emb1.length !== emb2.length) return 0;
  
  // Do các vector đã được chuẩn hóa, Cosine Similarity chính là tích vô hướng (Dot Product)
  let dotProduct = 0;
  for (let i = 0; i < emb1.length; i++) {
    dotProduct += emb1[i] * emb2[i];
  }
  
  // Ánh xạ tích vô hướng từ [-1, 1] sang thang điểm phần trăm [0, 100]
  const similarity = ((dotProduct + 1) / 2) * 100;
  return parseFloat(similarity.toFixed(2));
}

// Mô phỏng tọa độ các điểm mốc trên khuôn mặt (Facial Landmarks) để vẽ lưới công nghệ cao trên canvas
export interface FacialLandmarks {
  box: { x: number; y: number; width: number; height: number };
  leftEye: { x: number; y: number };
  rightEye: { x: number; y: number };
  nose: { x: number; y: number };
  mouth: { x: number; y: number }[];
  jawline: { x: number; y: number }[];
}

export function generateMockLandmarks(
  canvasWidth: number,
  canvasHeight: number,
  jitter: boolean = true
): FacialLandmarks {
  // Đặt tâm khuôn mặt ở giữa màn hình nhưng có sự dao động nhỏ (mô phỏng chuyển động thực tế)
  const time = Date.now() * 0.003;
  const dx = jitter ? Math.sin(time) * 8 : 0;
  const dy = jitter ? Math.cos(time * 0.8) * 8 : 0;

  const cx = canvasWidth / 2 + dx;
  const cy = canvasHeight / 2 + dy - 20;

  const w = 180 + (jitter ? Math.sin(time * 0.5) * 4 : 0);
  const h = 240 + (jitter ? Math.cos(time * 0.5) * 4 : 0);

  const x = cx - w / 2;
  const y = cy - h / 2;

  // Điểm mốc chi tiết khuôn mặt
  const leftEye = { x: cx - 35, y: cy - 25 };
  const rightEye = { x: cx + 35, y: cy - 25 };
  const nose = { x: cx, y: cy + 10 };
  
  // Miệng: gồm 4 điểm vẽ hình thoi nhỏ biểu diễn môi
  const mouth = [
    { x: cx - 25, y: cy + 50 }, // Mép trái
    { x: cx, y: cy + 42 },      // Môi trên
    { x: cx + 25, y: cy + 50 }, // Mép phải
    { x: cx, y: cy + 58 },      // Môi dưới
  ];

  // Đường viền hàm dưới (9 điểm mốc từ tai trái xuống cằm rồi lên tai phải)
  const jawline = [];
  for (let i = 0; i < 9; i++) {
    const angle = Math.PI + (i * Math.PI) / 8; // Từ góc 180 độ đến 360 độ (hàm dưới)
    const rx = w / 2;
    const ry = h / 2;
    jawline.push({
      x: cx + Math.cos(angle) * rx * 0.9,
      y: cy + Math.sin(angle) * ry * 0.75,
    });
  }

  return {
    box: { x, y, width: w, height: h },
    leftEye,
    rightEye,
    nose,
    mouth,
    jawline,
  };
}

// Nhận diện khuôn mặt từ một embedding quét được so với danh sách học sinh
export function recognizeFace(
  scannedEmbedding: number[],
  students: Student[],
  threshold: number = 82 // Ngưỡng nhận dạng (%)
): { student: Student | null; similarity: number } {
  let bestMatch: Student | null = null;
  let highestSimilarity = 0;

  for (const student of students) {
    if (!student.faceEmbedding) continue;
    
    const similarity = calculateSimilarity(scannedEmbedding, student.faceEmbedding);
    if (similarity > highestSimilarity) {
      highestSimilarity = similarity;
      bestMatch = student;
    }
  }

  if (highestSimilarity >= threshold) {
    return { student: bestMatch, similarity: highestSimilarity };
  }

  return { student: null, similarity: highestSimilarity };
}
