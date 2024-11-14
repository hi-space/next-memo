// src/components/MemoList.tsx
'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAppDispatch, useAppSelector } from '@/hooks/redux';
import {
  fetchMemos,
  deleteMemo,
  updateMemo,
  resetMemos,
  createMemo,
} from '@/store/memoSlice';
import { Box, LinearProgress, Alert } from '@mui/material';
import Masonry from '@mui/lab/Masonry';
import { Memo } from '@/types/memo';
import MemoCard from './MemoCard';
import MemoForm from './MemoForm';

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

  const handleEdit = useCallback(
    async (content: string, newFiles: File[], deletedFileUrls: string[]) => {
      if (!editingMemo) return;

      const formData = new FormData();
      formData.append('content', content);
      formData.append('createdAt', editingMemo.createdAt);
      formData.append('deletedFileUrls', JSON.stringify(deletedFileUrls));

      newFiles.forEach((file, index) => {
        formData.append(`files[${index}]`, file);
      });

      try {
        const updatedMemo = await dispatch(
          updateMemo({ id: editingMemo.id, formData })
        ).unwrap();

        dispatch({
          type: 'memos/updateMemoInState',
          payload: updatedMemo,
        });

        setEditingMemo(null);
      } catch (error) {
        console.error('Failed to update memo:', error);
        alert('메모 수정에 실패했습니다.');
      }
    },
    [dispatch, editingMemo]
  );

  const handleCreate = useCallback(
    async (content: string, newFiles: File[], _: string[]) => {
      const formData = new FormData();
      formData.append('content', content);
      newFiles.forEach((file, index) => {
        formData.append(`files[${index}]`, file);
      });

      try {
        await dispatch(createMemo(formData)).unwrap();
        // 목록 새로고침
        dispatch(resetMemos());
        dispatch(fetchMemos());
      } catch (error) {
        console.error('Failed to create memo:', error);
        throw error; // MemoForm의 catch 블록에서 처리하도록 에러를 전파
      }
    },
    [dispatch]
  );

  const handleDelete = useCallback(
    async (id: string, createdAt: string) => {
      if (window.confirm('정말 이 메모를 삭제하시겠습니까?')) {
        try {
          await dispatch(deleteMemo({ id, createdAt })).unwrap();
          dispatch({
            type: 'memos/removeMemoFromState',
            payload: id,
          });
        } catch (error) {
          console.error('Failed to delete memo:', error);
        }
      }
    },
    [dispatch]
  );

  if (initialLoading) {
    return (
      <Box display='flex' justifyContent='center' p={4}>
        <LinearProgress />
      </Box>
    );
  }

  if (error) {
    return <Alert severity='error'>{error}</Alert>;
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <MemoForm mode='create' onSubmit={handleCreate} />

      <Masonry columns={{ sm: 1, lg: 2 }} spacing={2} sx={{ margin: 0 }}>
        {memos.map((memo, index) => (
          <MemoCard
            key={memo.id}
            memo={memo}
            onEdit={setEditingMemo}
            onDelete={handleDelete}
          />
        ))}
      </Masonry>

      {hasMore && <Box ref={lastMemoRef} sx={{ height: 20 }} />}

      {loading && !initialLoading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
          <LinearProgress />
        </Box>
      )}

      {editingMemo && (
        <MemoForm
          mode='edit'
          memo={editingMemo}
          isDialog
          onClose={() => setEditingMemo(null)}
          onSubmit={handleEdit}
        />
      )}
    </Box>
  );
};

export default MemoList;
