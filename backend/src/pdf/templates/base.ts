/** Escape HTML để tránh vỡ layout khi nội dung có ký tự đặc biệt. */
export function esc(s: unknown): string {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/** CSS dùng chung cho mọi phiếu in — tông sáng, thân thiện. */
export const BASE_CSS = `
  * { box-sizing: border-box; }
  body {
    font-family: 'Segoe UI', 'Noto Sans', 'DejaVu Sans', 'Liberation Sans', Arial, sans-serif;
    color: #1f2a37; font-size: 13px; line-height: 1.5; margin: 0;
  }
  .header {
    border-bottom: 3px solid #4F86C6; padding-bottom: 10px; margin-bottom: 16px;
  }
  .header h1 { margin: 0 0 4px; font-size: 20px; color: #4F86C6; }
  .meta { color: #5b6776; font-size: 12px; }
  .student-line {
    display: flex; gap: 24px; margin: 10px 0 18px; font-size: 12px; color: #374151;
  }
  .student-line .field { flex: 1; border-bottom: 1px dotted #9aa6b2; padding-bottom: 2px; }
  .instructions {
    background: #F7F9FC; border-left: 4px solid #F5A623;
    padding: 8px 12px; border-radius: 6px; margin-bottom: 16px; font-size: 12px;
  }
  .q { margin-bottom: 16px; page-break-inside: avoid; }
  .q-head { font-weight: 600; }
  .q-points { color: #5BAD8F; font-weight: 600; font-size: 11px; margin-left: 6px; }
  .options { margin: 6px 0 0 16px; }
  .options li { margin: 2px 0; list-style: none; }
  .blank { border-bottom: 1px solid #c4ccd6; height: 18px; margin: 8px 0; }
  .answer { color: #16794f; background: #eafaf2; padding: 6px 10px; border-radius: 6px; margin-top: 6px; font-size: 12px; }
  .answer b { color: #0f5132; }
  .footer { margin-top: 24px; text-align: center; color: #9aa6b2; font-size: 10px; }
`;

export function htmlDoc(body: string, css = ''): string {
  return `<!doctype html><html lang="vi"><head><meta charset="utf-8">
<style>${BASE_CSS}${css}</style></head><body>${body}</body></html>`;
}
