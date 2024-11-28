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

interface FetchMemoParams {
  priority?: number;
  searchTerm?: string;
  reset?: boolean; // 새 검색/필터 시 목록 초기화를 위한 플래그
}

export const fetchMemos = createAsyncThunk(
  'memos/fetchMemos',
  async (params: FetchMemoParams = {}, { getState }) => {
    const state = getState() as { memos: MemoState };
    const { lastEvaluatedKey } = state.memos;

    const urlParams = new URLSearchParams();

    // reset이 true가 아닐 때만 lastEvaluatedKey 사용
    if (lastEvaluatedKey && !params.reset) {
      urlParams.append('lastKey', JSON.stringify(lastEvaluatedKey));
    }

    if (params.priority !== undefined) {
      urlParams.append('priority', params.priority.toString());
    }

    if (params.searchTerm) {
      urlParams.append('searchTerm', params.searchTerm);
    }

    const response = await fetch(`/api/memos?${urlParams}`);
    if (!response.ok) throw new Error('메모를 불러오는데 실패했습니다.');
    const data = await response.json();
    return {
      ...data,
      reset: params.reset,
    };
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

        // reset이 true면 목록 초기화, 아니면 기존 목록에 추가
        if (action.payload.reset) {
          state.memos = newMemos;
        } else {
          state.memos = [...state.memos, ...newMemos];
        }

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
