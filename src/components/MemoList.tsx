// src/components/MemoList.tsx
"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useAppDispatch, useAppSelector } from "@/hooks/redux";
import {
  fetchMemos,
  deleteMemo,
  updateMemo,
  resetMemos,
} from "@/store/memoSlice";
import {
  Box,
  Card,
  CardContent,
  CardMedia,
  Typography,
  Link,
  CircularProgress,
  Alert,
  IconButton,
  CardActions,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
} from "@mui/material";
import EditDialog from "./EditDialog";
import { Memo } from "@/types/memo";
import MemoCard from "./MemoCard";

const MemoList: React.FC = () => {
  const dispatch = useAppDispatch();
  const { memos, loading, error, hasMore } = useAppSelector(
    (state) => state.memos
  );
  const [editingMemo, setEditingMemo] = useState<Memo | null>(null);
  const [initialLoading, setInitialLoading] = useState(true);
  const observerRef = useRef<IntersectionObserver | null>(null);

  const loadMore = useCallback(() => {
    if (!loading && hasMore) {
      dispatch(fetchMemos());
    }
  }, [dispatch, loading, hasMore]);

  // 초기 로딩
  useEffect(() => {
    dispatch(fetchMemos()).then(() => setInitialLoading(false));
  }, [dispatch]);

  // IntersectionObserver 설정
  const lastMemoRef = useCallback(
    (node: HTMLDivElement | null) => {
      if (loading) return;

      if (observerRef.current) {
        observerRef.current.disconnect();
      }

      observerRef.current = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting && hasMore) {
          loadMore();
        }
      });

      if (node) {
        observerRef.current.observe(node);
      }
    },
    [loading, hasMore, loadMore]
  );

  const handleEdit = async (content: string, file: File | null) => {
    if (!editingMemo) return;

    const formData = new FormData();
    formData.append("content", content);
    formData.append("createdAt", editingMemo.createdAt); // createdAt 추가
    if (file) {
      formData.append("file", file);
    }

    try {
      await dispatch(updateMemo({ id: editingMemo.id, formData })).unwrap();
      await dispatch(fetchMemos()).unwrap();
      setEditingMemo(null);
    } catch (error) {
      console.error("Failed to update memo:", error);
    }
  };

  const handleDelete = async (id: string, createdAt: string) => {
    if (window.confirm("정말 이 메모를 삭제하시겠습니까?")) {
      try {
        await dispatch(deleteMemo({ id, createdAt })).unwrap();
        dispatch(resetMemos());
        dispatch(fetchMemos());
      } catch (error) {
        console.error("Failed to delete memo:", error);
      }
    }
  };

  if (initialLoading) {
    return (
      <Box display="flex" justifyContent="center" p={4}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return <Alert severity="error">{error}</Alert>;
  }

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
      {memos.map((memo) => (
        <MemoCard
          key={memo.id}
          memo={memo}
          onEdit={setEditingMemo}
          onDelete={handleDelete}
        />
      ))}

      {hasMore && <Box ref={lastMemoRef} sx={{ height: 20 }} />}

      {loading && !initialLoading && (
        <Box sx={{ display: "flex", justifyContent: "center", py: 2 }}>
          <CircularProgress />
        </Box>
      )}

      <EditDialog
        open={Boolean(editingMemo)}
        memo={editingMemo}
        onClose={() => setEditingMemo(null)}
        onSave={handleEdit}
      />
    </Box>
  );
};

export default MemoList;
