import LZString from 'lz-string';
import { StudentCabinet, TestQuestion, AssignedTest } from '../types';

/**
 * Safe encoding and decoding of Unicode JSON objects to and from Base64.
 * Uses lz-string for high-efficiency URL-safe compression.
 */

export function encodeData(data: any): string {
  try {
    const jsonStr = JSON.stringify(data);
    return LZString.compressToEncodedURIComponent(jsonStr);
  } catch (e) {
    console.error('Encoding error:', e);
    return '';
  }
}

export function decodeData(compressedBase64: string): any {
  if (!compressedBase64) return null;
  
  // 1. Try to decompress using lz-string
  try {
    const decompressed = LZString.decompressFromEncodedURIComponent(compressedBase64);
    if (decompressed) {
      return JSON.parse(decompressed);
    }
  } catch (e) {
    // If lz-string fails, we proceed to fallback base64 decoding
  }

  // 2. Fallback to old base64 decoding method for backward compatibility
  try {
    let normalized = compressedBase64.replace(/-/g, '+').replace(/_/g, '/');
    while (normalized.length % 4) {
      normalized += '=';
    }
    const binary = atob(normalized);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    const jsonStr = new TextDecoder().decode(bytes);
    return JSON.parse(jsonStr);
  } catch (e) {
    console.error('Decoding error in both lz-string and fallback:', e);
    return null;
  }
}

// Compact types for extreme URL-shortening
export interface CompactCabinet {
  i: string; // id
  s: string; // studentId
  n: string; // studentName
  t: string; // tutorId
  c: string; // createdAt
  a: CompactAssignedTest[]; // assignedTests
}

export interface CompactAssignedTest {
  i: string; // id
  m: string; // templateId
  l: string; // title
  y: 'OGE' | 'EGE'; // type
  q: CompactQuestion[]; // questions
  s: 'pending' | 'submitted'; // status
  t: string; // assignedAt
  u?: string; // submittedAt
  a?: Record<string, string>; // answers
  d?: Record<string, boolean>; // wantToDiscuss
  r?: number; // score
  o?: number; // totalQuestions
  c?: Record<string, boolean>; // checkedResults
}

export interface CompactQuestion {
  i: string; // id
  t: 'short' | 'single'; // type
  x: string; // text
  o?: string[]; // options
  c: string; // correctAnswer
}

export function toCompact(cabinet: StudentCabinet): CompactCabinet {
  return {
    i: cabinet.id,
    s: cabinet.studentId || '',
    n: cabinet.studentName,
    t: cabinet.tutorId,
    c: cabinet.createdAt,
    a: (cabinet.assignedTests || []).map(t => ({
      i: t.id,
      m: t.templateId,
      l: t.title,
      y: t.type,
      q: (t.questions || []).map(q => ({
        i: q.id,
        t: q.type as 'short' | 'single',
        x: q.text,
        o: q.options,
        c: q.correctAnswer || '',
      })),
      s: t.status,
      t: t.assignedAt,
      u: t.submittedAt,
      a: t.answers,
      d: t.wantToDiscuss,
      r: t.score,
      o: t.totalQuestions,
      c: t.checkedResults,
    })),
  };
}

export function fromCompact(compact: CompactCabinet): StudentCabinet {
  return {
    id: compact.i,
    studentId: compact.s,
    studentName: compact.n,
    tutorId: compact.t,
    createdAt: compact.c,
    assignedTests: (compact.a || []).map(t => ({
      id: t.i,
      templateId: t.m,
      title: t.l,
      type: t.y,
      questions: (t.q || []).map(q => ({
        id: q.i,
        type: q.t,
        text: q.x,
        options: q.o,
        correctAnswer: q.c,
      })),
      status: t.s,
      assignedAt: t.t,
      submittedAt: t.u,
      answers: t.a,
      wantToDiscuss: t.d,
      score: t.r,
      totalQuestions: t.o,
      checkedResults: t.c,
    })),
  };
}

// Compact result submission for student copy-pasting
export interface CompactResult {
  i: string; // cabinetId
  t: string; // assignedTestId
  a: Record<string, string>; // answers
  d: Record<string, boolean>; // wantToDiscuss
  r: number; // score
  u: string; // submittedAt
}

export function compressResult(res: CompactResult): string {
  return encodeData(res);
}

export function decompressResult(code: string): CompactResult | null {
  return decodeData(code);
}

