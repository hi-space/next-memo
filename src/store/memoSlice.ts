import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import type { PayloadAction } from "@reduxjs/toolkit";
import { Memo } from "@/types/memo";

interface MemoState {
  memos: Memo[];
  loading: boolean;
  error: string | null;
}

const initialState: MemoState = {
  memos: [],
  loading: false,
  error: null,
};

export const fetchMemos = createAsyncThunk("memos/fetchMemos", async () => {
  const response = await fetch("/api/memos");
  if (!response.ok) throw new Error("메모를 불러오는데 실패했습니다.");
  return response.json();
});

export const createMemo = createAsyncThunk(
  "memos/createMemo",
  async (formData: FormData) => {
    const response = await fetch("/api/memos", {
      method: "POST",
      body: formData,
    });
    if (!response.ok) throw new Error("메모 작성에 실패했습니다.");
    return response.json();
  }
);

export const deleteMemo = createAsyncThunk(
  "memos/deleteMemo",
  async (id: string) => {
    const response = await fetch(`/api/memos/${id}`, {
      method: "DELETE",
    });
    if (!response.ok) throw new Error("메모 삭제에 실패했습니다.");
    return id;
  }
);

export const updateMemo = createAsyncThunk(
  "memos/updateMemo",
  async ({ id, formData }: { id: string; formData: FormData }) => {
    const response = await fetch(`/api/memos/${id}`, {
      method: "PUT",
      body: formData,
    });
    if (!response.ok) throw new Error("메모 수정에 실패했습니다.");
    return response.json();
  }
);
const memoSlice = createSlice({
  name: "memos",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchMemos.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchMemos.fulfilled, (state, action: PayloadAction<Memo[]>) => {
        state.memos = action.payload;
        state.loading = false;
      })
      .addCase(fetchMemos.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message ?? "오류가 발생했습니다.";
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
        state.error = action.error.message ?? "오류가 발생했습니다.";
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
        state.error = action.error.message ?? "오류가 발생했습니다.";
      })
      .addCase(updateMemo.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateMemo.fulfilled, (state) => {
        state.loading = false;
      })
      .addCase(updateMemo.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message ?? "오류가 발생했습니다.";
      });
  },
});

export default memoSlice.reducer;
