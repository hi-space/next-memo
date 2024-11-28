import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { Memo } from '@/types/memo';

interface MemoState {
  memos: Memo[];
  loading: boolean;
  error: string | null;
  hasMore: boolean;
  lastEvaluatedKey: any | null;
}

const initialState: MemoState = {
  memos: [],
  loading: false,
  error: null,
  hasMore: true,
  lastEvaluatedKey: null,
};

export const fetchMemos = createAsyncThunk(
  'memos/fetchMemos',
  async (params: { priority?: number } = {}, { getState }) => {
    const state = getState() as { memos: MemoState };
    const { lastEvaluatedKey } = state.memos;

    const urlParams = new URLSearchParams();
    if (lastEvaluatedKey) {
      urlParams.append('lastKey', JSON.stringify(lastEvaluatedKey));
    }
    if (params.priority !== undefined) {
      urlParams.append('priority', params.priority.toString());
    }

    const response = await fetch(`/api/memos?${urlParams}`);
    if (!response.ok) throw new Error('메모를 불러오는데 실패했습니다.');
    const data = await response.json();
    return data;
  }
);

export const createMemo = createAsyncThunk(
  'memos/createMemo',
  async (formData: FormData) => {
    const response = await fetch('/api/memos', {
      method: 'POST',
      body: formData,
    });
    if (!response.ok) throw new Error('메모 작성에 실패했습니다.');
    return response.json();
  }
);

export const deleteMemo = createAsyncThunk(
  'memos/deleteMemo',
  async (id: string) => {
    const response = await fetch(`/api/memos/${id}`, {
      method: 'DELETE',
    });
    if (!response.ok) throw new Error('메모 삭제에 실패했습니다.');
    return id;
  }
);

export const updateMemo = createAsyncThunk(
  'memos/updateMemo',
  async ({ id, formData }: { id: string; formData: FormData }) => {
    const response = await fetch(`/api/memos/${id}`, {
      method: 'PUT',
      body: formData,
    });
    if (!response.ok) throw new Error('메모 수정에 실패했습니다.');
    return await response.json();
  }
);

const memoSlice = createSlice({
  name: 'memos',
  initialState,
  reducers: {
    resetMemos: (state) => {
      state.memos = [];
      state.lastEvaluatedKey = null;
      state.hasMore = true;
    },
    updateMemoInState: (state, action) => {
      const updatedMemo = action.payload;
      state.memos = state.memos.map((memo) =>
        memo.id === updatedMemo.id ? updatedMemo : memo
      );
    },
    removeMemoFromState: (state, action) => {
      const id = action.payload;
      state.memos = state.memos.filter((memo) => memo.id !== id);
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchMemos.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchMemos.fulfilled, (state, action) => {
        const newMemos = action.payload.items;

        // 기존 데이터에 새 데이터를 추가
        state.memos = [...state.memos, ...newMemos];

        // 페이지네이션 처리
        state.lastEvaluatedKey = action.payload.lastEvaluatedKey;
        state.hasMore = !!action.payload.lastEvaluatedKey;
        state.loading = false;
      })
      .addCase(fetchMemos.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message ?? '오류가 발생했습니다.';
      })
      .addCase(createMemo.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createMemo.fulfilled, (state) => {
        state.loading = false;
      })
      .addCase(createMemo.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message ?? '오류가 발생했습니다.';
      })
      .addCase(deleteMemo.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteMemo.fulfilled, (state, action) => {
        state.memos = state.memos.filter((memo) => memo.id !== action.payload);
        state.loading = false;
      })
      .addCase(deleteMemo.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message ?? '오류가 발생했습니다.';
      })
      .addCase(updateMemo.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateMemo.fulfilled, (state, action) => {
        state.loading = false;

        const updatedMemo = action.payload;

        // 메모 상태 업데이트
        state.memos = state.memos.map((memo) =>
          memo.id === updatedMemo.id ? { ...updatedMemo } : memo
        );
      })
      .addCase(updateMemo.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message ?? '오류가 발생했습니다.';
      });
  },
});

export default memoSlice.reducer;

export const { resetMemos } = memoSlice.actions;
