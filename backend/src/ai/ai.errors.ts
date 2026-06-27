import Anthropic from '@anthropic-ai/sdk';

/**
 * Lỗi AI đã được phân loại: biết có nên cho hệ thống tự thử lại (retry) hay không,
 * kèm thông báo thân thiện để hiển thị cho người dùng cuối.
 */
export class AiError extends Error {
  constructor(
    message: string,
    /** true = lỗi tạm thời, nên thử lại; false = retry vô ích, dừng hẳn. */
    readonly retryable: boolean,
    /** Thông báo gọn, thân thiện để hiển thị trên UI. */
    readonly userMessage: string,
    readonly cause?: unknown,
  ) {
    super(message);
    this.name = 'AiError';
  }
}

/** Bắt các từ khoá lỗi không thể tự khỏi bằng retry (hết tiền / hết hạn mức). */
function looksLikeBilling(text: string): boolean {
  return /credit balance|billing|insufficient|quota|resource_exhausted|out of (credits|quota)/i.test(
    text,
  );
}
function looksLikeAuth(text: string): boolean {
  return /api[\s_-]?key|unauthorized|permission denied|authentication|invalid x-api-key|api key not valid/i.test(
    text,
  );
}
function looksLikeTransient(text: string): boolean {
  return /timeout|timed out|network|fetch failed|ECONN|ETIMEDOUT|socket hang up|overloaded|\b50[23]\b|temporarily/i.test(
    text,
  );
}

/**
 * Chuyển một lỗi bất kỳ (từ Anthropic SDK, Gemini SDK, hoặc lỗi thường) thành
 * {@link AiError} đã phân loại để bên gọi quyết định retry & hiển thị thông báo.
 */
export function classifyAiError(err: unknown): AiError {
  if (err instanceof AiError) return err;

  // Lỗi kết nối mạng của Anthropic (extends APIError nên kiểm tra trước).
  if (err instanceof Anthropic.APIConnectionError) {
    return new AiError(
      `Anthropic connection error: ${err.message}`,
      true,
      'Không kết nối được tới dịch vụ AI, hệ thống sẽ tự thử lại sau giây lát.',
      err,
    );
  }

  if (err instanceof Anthropic.APIError) {
    const status = err.status;
    const body = err.error as { error?: { message?: string } } | undefined;
    const apiMessage =
      body?.error?.message ?? err.message ?? 'Lỗi không xác định';

    if (looksLikeBilling(apiMessage)) {
      return new AiError(
        `Anthropic credit balance too low: ${apiMessage}`,
        false,
        'Dịch vụ AI tạm ngưng do tài khoản hết credit. Vui lòng nạp thêm hoặc chọn model khác.',
        err,
      );
    }
    if (status === 401 || status === 403) {
      return new AiError(
        `Anthropic auth error (${status}): ${apiMessage}`,
        false,
        'Khóa API của model này không hợp lệ. Vui lòng kiểm tra cấu hình hoặc chọn model khác.',
        err,
      );
    }
    if (status === 429 || (status != null && status >= 500)) {
      return new AiError(
        `Anthropic tạm thời quá tải (${status}): ${apiMessage}`,
        true,
        'Dịch vụ AI đang bận, hệ thống sẽ tự thử lại. Vui lòng đợi giây lát.',
        err,
      );
    }
    return new AiError(
      `Anthropic request error (${status}): ${apiMessage}`,
      false,
      'Không xử lý được yêu cầu AI với dữ liệu này. Vui lòng kiểm tra lại nội dung.',
      err,
    );
  }

  // Lỗi từ Gemini SDK hoặc lỗi thường — phân loại theo nội dung thông báo.
  const message = err instanceof Error ? err.message : String(err);
  if (looksLikeBilling(message)) {
    return new AiError(
      message,
      false,
      'Dịch vụ AI tạm ngưng do hết hạn mức/credit. Vui lòng kiểm tra tài khoản hoặc chọn model khác.',
      err,
    );
  }
  if (looksLikeAuth(message)) {
    return new AiError(
      message,
      false,
      'Khóa API của model này không hợp lệ hoặc chưa cấu hình. Vui lòng chọn model khác.',
      err,
    );
  }
  if (looksLikeTransient(message)) {
    return new AiError(
      message,
      true,
      'Dịch vụ AI đang bận hoặc mất kết nối, hệ thống sẽ tự thử lại.',
      err,
    );
  }

  // Không xác định: mặc định cho thử lại để giữ hành vi cũ.
  return new AiError(message, true, message, err);
}
