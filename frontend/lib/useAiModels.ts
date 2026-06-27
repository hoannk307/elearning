'use client';

import { useEffect, useState } from 'react';
import { api } from './api';
import { AiModelInfo, AiModelsResponse } from './types';

/**
 * Tải danh sách model AI + model mặc định 1 lần, và quản lý model đang chọn.
 * Model đang chọn khởi tạo theo model mặc định khi tải xong.
 */
export function useAiModels() {
  const [models, setModels] = useState<AiModelInfo[]>([]);
  const [defaultModel, setDefaultModel] = useState<string>('');
  const [model, setModel] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    api<AiModelsResponse>('/settings/ai-models')
      .then((res) => {
        if (!active) return;
        setModels(res.models);
        setDefaultModel(res.defaultModel);
        setModel((cur) => cur || res.defaultModel);
      })
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, []);

  return { models, defaultModel, model, setModel, loading, setModels, setDefaultModel };
}
