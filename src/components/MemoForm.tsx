'use client';

import { useState, useCallback } from 'react';
import { useAppDispatch } from '@/hooks/redux';
import { createMemo, fetchMemos, resetMemos } from '@/store/memoSlice';
import {
  Box,
  TextField,
  IconButton,
  Button,
  Paper,
  Typography,
  CircularProgress,
} from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import DeleteIcon from '@mui/icons-material/Delete';
import { useDropzone } from 'react-dropzone';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import MarkdownEditor from '@/components/MarkdownEditor';

const MemoForm: React.FC = () => {
  const [content, setContent] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const dispatch = useAppDispatch();

  const onDrop = useCallback((acceptedFiles: File[]) => {
    setFiles((prevFiles) => [...prevFiles, ...acceptedFiles]);
  }, []);

  const removeFile = (indexToRemove: number) => {
    setFiles((prevFiles) =>
      prevFiles.filter((_, index) => index !== indexToRemove)
    );
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    multiple: true,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const formData = new FormData();
      formData.append('content', content);
      files.forEach((file, index) => {
        formData.append(`files[${index}]`, file);
      });

      await dispatch(createMemo(formData)).unwrap();
      dispatch(resetMemos()); // 목록 리셋
      dispatch(fetchMemos()); // 다시 로딩
      setContent('');
      setFiles([]);
    } catch (error) {
      console.error(error);
      alert('메모 작성에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Paper elevation={3} sx={{ p: 3, mb: 4 }}>
      <Box
        component='form'
        onSubmit={handleSubmit}
        sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <Typography variant='h6' component='h2'>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <AddCircleOutlineIcon sx={{ fontSize: '1.7rem' }} />새 메모
          </Box>
        </Typography>

        <MarkdownEditor value={content} onChange={setContent} height='400px' />

        <Box
          {...getRootProps()}
          sx={{
            p: 2,
            border: '2px dashed',
            borderColor: isDragActive ? 'primary.main' : 'grey.300',
            borderRadius: 1,
            backgroundColor: isDragActive ? 'action.hover' : 'background.paper',
            cursor: 'pointer',
            textAlign: 'center',
            transition: 'all 0.2s ease',
            '&:hover': {
              borderColor: 'primary.main',
              backgroundColor: 'action.hover',
            },
          }}>
          <input {...getInputProps()} />
          <CloudUploadIcon
            sx={{ fontSize: '2rem', mb: 1, color: 'primary.main' }}
          />
          <Typography>
            {isDragActive
              ? '파일을 여기에 놓으세요'
              : '파일을 드래그하여 놓거나 클릭하여 선택하세요'}
          </Typography>
        </Box>

        {files.length > 0 && (
          <Box sx={{ mt: 2 }}>
            <Typography variant='subtitle2' sx={{ mb: 1 }}>
              업로드된 파일 ({files.length}개)
            </Typography>
            <Box
              sx={{
                display: 'flex',
                flexDirection: 'column',
                gap: 1,
                maxHeight: '200px',
                overflowY: 'auto',
                p: 1,
                border: '1px solid',
                borderColor: 'grey.300',
                borderRadius: 1,
              }}>
              {files.map((file, index) => (
                <Box
                  key={index}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    p: 1,
                    backgroundColor: 'grey.50',
                    borderRadius: 1,
                  }}>
                  <Typography
                    variant='body2'
                    sx={{
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      flex: 1,
                      mr: 1,
                    }}>
                    {file.name} ({(file.size / 1024).toFixed(1)}KB)
                  </Typography>
                  <IconButton
                    size='small'
                    onClick={() => removeFile(index)}
                    sx={{ color: 'error.main' }}>
                    <DeleteIcon fontSize='small' />
                  </IconButton>
                </Box>
              ))}
            </Box>
          </Box>
        )}

        <Button
          type='submit'
          variant='contained'
          color='primary'
          sx={{ flex: 1 }}>
          저장
        </Button>
      </Box>
    </Paper>
  );
};

export default MemoForm;
