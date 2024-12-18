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
import { Box, LinearProgress, Alert, Divider } from '@mui/material';
import Masonry from '@mui/lab/Masonry';
import { Memo } from '@/types/memo';
import MemoCard from './MemoCard';
import MemoForm from './MemoForm';
import MemoSearch from './MemoSearch';
import { Priority } from '@/types/priority';

const MemoList: React.FC = () => {
  const dispatch = useAppDispatch();
  const { memos, loading, error, hasMore } = useAppSelector(
    (state) => state.memos
  );
  const [editingMemo, setEditingMemo] = useState<Memo | null>(null);
  const [initialLoading, setInitialLoading] = useState(true);
  const [currentSearchTerm, setCurrentSearchTerm] = useState('');
  const [currentPriority, setCurrentPriority] = useState<
    Priority | undefined
  >();
  const [currentPrefix, setCurrentPrefix] = useState<string | undefined>();

  const observerRef = useRef<IntersectionObserver | null>(null);

  const loadMore = useCallback(() => {
    if (!loading && hasMore) {
      dispatch(
        fetchMemos({
          searchTerm: currentSearchTerm,
          priority: currentPriority,
          prefix: currentPrefix,
        })
      );
    }
  }, [
    dispatch,
    loading,
    hasMore,
    currentSearchTerm,
    currentPriority,
    currentPrefix,
  ]);

  // 초기 로딩
  useEffect(() => {
    dispatch(fetchMemos({})).then(() => setInitialLoading(false));
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
    async (
      title: string,
      content: string,
      priority: number,
      newFiles: File[],
      deletedFileUrls: string[],
      prefix?: string
    ) => {
      if (!editingMemo) return;

      const formData = new FormData();
      if (!editingMemo || !editingMemo.id) return;
      formData.append('id', editingMemo.id);
      formData.append('title', title);
      formData.append('prefix', prefix || '');
      formData.append('content', content);
      formData.append('priority', priority.toString());
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
    async (
      title: string,
      content: string,
      priority: number,
      newFiles: File[],
      _: string[],
      prefix?: string
    ) => {
      const formData = new FormData();
      formData.append('title', title);
      formData.append('prefix', prefix || '');
      formData.append('content', content);
      formData.append('priority', priority.toString());
      newFiles.forEach((file, index) => {
        formData.append(`files[${index}]`, file);
      });

      try {
        const createdMemo = await dispatch(createMemo(formData)).unwrap();
        handleGenerateSummary(createdMemo);

        // 목록 새로고침
        dispatch(resetMemos());
        dispatch(fetchMemos({}));
      } catch (error) {
        console.error('Failed to create memo:', error);
        throw error;
      }
    },
    [dispatch]
  );

  const handleGenerateSummary = async (memo: Memo) => {
    try {
      const response = await fetch(`/api/summary`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(memo),
      });

      if (!response.ok) {
        console.error('API response error:', response.statusText);
        return;
      }

      const data = await response.json();
      const updatedMemo = {
        ...memo,
        title: data.title || memo.title,
        tags: data.tags || memo.tags,
        summary: data.summary || memo.summary,
      };

      dispatch({ type: 'memos/updateMemoInState', payload: updatedMemo });
    } catch (error) {
      console.error('Generate failed:', error);
    }
  };

  const handleDelete = useCallback(
    async (id: string) => {
      // createdAt 파라미터 제거
      if (window.confirm('정말 이 메모를 삭제하시겠습니까?')) {
        try {
          await dispatch(deleteMemo(id)).unwrap(); // id만 전달
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

  const handleUpdateMemo = useCallback(
    (updatedMemo: Memo) => {
      dispatch({
        type: 'memos/updateMemoInState',
        payload: updatedMemo,
      });
    },
    [dispatch]
  );

  const handleSearch = useCallback(
    (term: string) => {
      setCurrentSearchTerm(term);
      dispatch(resetMemos());
      dispatch(
        fetchMemos({
          searchTerm: term,
          priority: currentPriority,
          reset: true,
        })
      );
    },
    [dispatch, currentPriority]
  );

  const handlePriorityFilter = useCallback(
    (priorityValue: Priority | null) => {
      setCurrentPriority(priorityValue !== null ? priorityValue : undefined);
      dispatch(resetMemos());
      dispatch(
        fetchMemos({
          priority: priorityValue !== null ? priorityValue : undefined,
          searchTerm: currentSearchTerm,
          prefix: currentPrefix,
          reset: true,
        })
      );
    },
    [dispatch, currentSearchTerm, currentPrefix]
  );

  const handlePrefixFilter = useCallback(
    (prefix: string) => {
      setCurrentPrefix(prefix);
      dispatch(resetMemos());
      dispatch(
        fetchMemos({
          priority: currentPriority,
          searchTerm: currentSearchTerm,
          prefix,
          reset: true,
        })
      );
    },
    [dispatch, currentPriority, currentSearchTerm]
  );

  const handleRefresh = useCallback(() => {
    // 모든 필터 상태 초기화
    setCurrentSearchTerm('');
    setCurrentPriority(undefined);
    setCurrentPrefix(undefined);

    // 로딩 상태 설정
    setInitialLoading(true);

    // 메모 상태 리셋
    dispatch(resetMemos());

    // 필터 없이 처음부터 다시 데이터 불러오기
    dispatch(fetchMemos({})).then(() => setInitialLoading(false));
  }, [dispatch]);

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

      <MemoSearch
        onSearch={handleSearch}
        onPriorityFilter={handlePriorityFilter}
        onPrefixFilter={handlePrefixFilter}
        onRefresh={handleRefresh}
      />

      <Masonry columns={{ sm: 1, lg: 1 }} spacing={2} sx={{ margin: 0 }}>
        {memos.map((memo, index) => (
          <MemoCard
            key={memo.id}
            memo={memo}
            onEdit={setEditingMemo}
            onDelete={handleDelete}
            onUpdate={handleUpdateMemo}
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
