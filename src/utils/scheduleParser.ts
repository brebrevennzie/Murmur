export interface ParsedStudentSchedule {
  name: string;
  schedule: string[];
}

export function parseScheduleCode(text: string): ParsedStudentSchedule[] {
  const trimmed = text.trim();
  if (!trimmed) return [];

  // 1. Try JSON parsing first for strict output structures
  if (trimmed.startsWith('[') || trimmed.startsWith('{') || trimmed.includes('[') || trimmed.includes('{')) {
    // Extract actual JSON if it's wrapped inside markdown ```json blocks
    let jsonContent = trimmed;
    const jsonBlockRegex = /```(?:json)?([\s\S]*?)```/;
    const blockMatch = jsonBlockRegex.exec(trimmed);
    if (blockMatch) {
      jsonContent = blockMatch[1].trim();
    } else {
      // Find index of first '{' or '[' and last '}' or ']'
      const startIdx = trimmed.search(/[\{\[]/);
      const endIdx = trimmed.lastIndexOf(trimmed.startsWith('[') ? ']' : '}');
      if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
        jsonContent = trimmed.substring(startIdx, endIdx + 1);
      }
    }

    try {
      const parsed = JSON.parse(jsonContent);
      
      if (Array.isArray(parsed)) {
        return parsed.map((item: any) => {
          const nameVal = item.name || item.studentName || item.student || '';
          const schedVal = item.schedule || item.time || item.slots || [];
          const scheduleList = Array.isArray(schedVal)
            ? schedVal
            : typeof schedVal === 'string'
              ? [schedVal]
              : [];
          return {
            name: String(nameVal).trim(),
            schedule: scheduleList.map((s: any) => String(s).trim()).filter(Boolean)
          };
        }).filter(item => item.name && item.schedule.length > 0);
      } else if (typeof parsed === 'object' && parsed !== null) {
        // Map as key-values e.g. { "Name": ["Пн 12:00"] } or { "Name": "Пн 12:00" }
        return Object.entries(parsed).map(([key, val]) => {
          const scheduleList = Array.isArray(val)
            ? val
            : typeof val === 'string'
              ? [val]
              : [];
          return {
            name: key.trim(),
            schedule: scheduleList.map((s: any) => String(s).trim()).filter(Boolean)
          };
        }).filter(item => item.name && item.schedule.length > 0);
      }
    } catch (err) {
      // Fall through to plain text parsing
      console.warn('Strict JSON lookup was skipped, utilizing text line parsers.', err);
    }
  }

  // 2. Plain text / Markdown list parsed line-by-line (Resilient Regex Pattern)
  const results: ParsedStudentSchedule[] = [];
  const lines = text.split('\n');

  // Days localization dictionary for robust normalizing
  const dayNameMapping: Record<string, string> = {
    'mon': 'Пн', 'tue': 'Вт', 'wed': 'Ср', 'thu': 'Чт', 'fri': 'Пт', 'sat': 'Сб', 'sun': 'Вс',
    'пн': 'Пн', 'вт': 'Вт', 'ср': 'Ср', 'чт': 'Чт', 'пт': 'Пт', 'сб': 'Сб', 'вс': 'Вс',
    'monday': 'Пн', 'tuesday': 'Вт', 'wednesday': 'Ср', 'thursday': 'Чт', 'friday': 'Пт', 'saturday': 'Сб', 'sunday': 'Вс',
    'понедельник': 'Пн', 'вторник': 'Вт', 'среда': 'Ср', 'четверг': 'Чт', 'пятница': 'Пт', 'суббота': 'Сб', 'воскресенье': 'Вс'
  };

  for (const rawLine of lines) {
    // Strip markdown formatting characters, list bullets, quote indentation
    let cleanLine = rawLine.replace(/^[\s*\-\+#>•¶=№]+/, '').trim();
    if (!cleanLine) continue;

    // Split candidate name from schedule values with separator tokens
    const separatorMatch = /[:\-\–\—\|=]/.exec(cleanLine);
    if (!separatorMatch) continue;

    const separatorIndex = separatorMatch.index;
    const rawName = cleanLine.substring(0, separatorIndex).trim();
    const rawSchedule = cleanLine.substring(separatorIndex + 1).trim();

    if (!rawName || !rawSchedule) continue;

    // Match timeslots using dynamic regex: captures the day prefix plus clock times
    // Days patterns and capture values
    const slotList: string[] = [];
    const slotRegex = /(пн|вт|ср|чт|пт|сб|вс|mon|tue|wed|thu|fri|sat|sun|понедельник|вторник|среда|четверг|пятница|суббота|воскресенье)\s*(\d{1,2}[:.-]\d{2})/gi;
    
    let match;
    while ((match = slotRegex.exec(rawSchedule)) !== null) {
      const matchDay = match[1].toLowerCase();
      const normDay = dayNameMapping[matchDay] || 'Пн';
      const rawTime = match[2].replace(/[-.]/g, ':'); // normalize separators (e.g. 16.30/16-30 to 16:30)
      
      // Pad single-hour times e.g. "9:00" to "09:00" for neat sorting alignment
      let [hours, minutes] = rawTime.split(':');
      if (hours.length === 1) {
        hours = '0' + hours;
      }
      const normTime = `${hours}:${minutes}`;

      slotList.push(`${normDay} ${normTime}`);
    }

    if (rawName && slotList.length > 0) {
      // Avoid duplicate student name outputs in exact single stream
      const existingIdx = results.findIndex(item => item.name.toLowerCase() === rawName.toLowerCase());
      if (existingIdx !== -1) {
        results[existingIdx].schedule = Array.from(new Set([...results[existingIdx].schedule, ...slotList]));
      } else {
        results.push({
          name: rawName,
          schedule: slotList
        });
      }
    }
  }

  return results;
}

export function parseRawKtpText(text: string): string[] {
  const lines = text.split('\n');
  const topics: string[] = [];
  
  for (let line of lines) {
    line = line.trim();
    if (!line) continue;
    
    // If copied from an Excel structure (delimiters are tabs)
    if (line.includes('\t')) {
      const parts = line.split('\t').map(p => p.trim()).filter(Boolean);
      // Filter out values that look like indices, simple dates, durations (e.g. "2ч", "1", "12.09")
      const candidates = parts.filter(p => {
        if (/^\d+$/.test(p)) return false;
        if (/^\d+\s*(ч|час|часа|часов|h|hrs)$/i.test(p)) return false;
        if (/^\d{1,2}[\.\/]\d{1,2}/.test(p)) return false;
        return true;
      });
      
      if (candidates.length > 0) {
        line = candidates[0];
      } else {
        line = parts[0];
      }
    }
    
    // Clean up prefix labels like "Тема 1. ", "Урок №2: ", "1. ", "1.1.", "1)"
    line = line.replace(/^(тема|урок|раздел|№)?\s*\d+([\.\)\-\s\d]+)?/i, '');
    line = line.replace(/^[\s\-\*\•\+\=\.\,]+/, '');
    
    const cleaned = line.trim();
    if (cleaned && cleaned.length > 1) {
      topics.push(cleaned);
    }
  }
  return topics;
}
