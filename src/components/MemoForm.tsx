'use client';

import { useState, useCallback, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Button,
  Box,
  Typography,
  Paper,
} from '@mui/material';
import {
  CloudUpload as CloudUploadIcon,
  Delete as DeleteIcon,
  Image as ImageIcon,
  Close as CloseIcon,
  AttachFile as AttachFileIcon,
  AddCircleOutline as AddCircleOutlineIcon,
} from '@mui/icons-material';
import { Memo } from '@/types/memo';
import MarkdownEditor from '@/components/MarkdownEditor';
import { escapeRegExp, isImageFile } from '@/utils/format';

interface MemoFormProps {
  mode: 'create' | 'edit';
  memo?: Memo | null;
  isDialog?: boolean;
  onClose?: () => void;
  onSubmit: (
    content: string,
    newFiles: File[],
    deletedFileUrls: string[]
  ) => Promise<void>;
}

const MemoForm: React.FC<MemoFormProps> = ({
  mode,
  memo,
  isDialog = false,
  onClose,
  onSubmit,
}) => {
  const [content, setContent] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<{ [key: string]: string }>({});
  const [deletedFileUrls, setDeletedFileUrls] = useState<string[]>([]);
  const existingFiles = memo?.files || [];

  useEffect(() => {
    if (mode === 'edit' && memo) {
      setContent(memo.content);
    } else {
      setContent('');
    }
    setFiles([]);
    setPreviewUrls({});
    setDeletedFileUrls([]);
  }, [mode, memo]);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    setFiles((prev) => [...prev, ...acceptedFiles]);
  }, []);

  // 컨텐트 내용 update
  useEffect(() => {
    const processContent = () => {
      files.forEach((file) => {
        const fileName = file.name;

        const url = previewUrls[fileName];
        if (url && !content.includes(`[${fileName}]`)) {
          const prefix = isImageFile(fileName) ? '!' : '';
          setContent((prev) => `${prev}\n${prefix}[${fileName}](${url})\n`);
        }
      });
    };

    processContent();
  }, [files, previewUrls]);

  // URL 생성을 처리하는 별도의 useEffect
  useEffect(() => {
    const newPreviewUrls: { [key: string]: string } = {};

    files.forEach((file) => {
      const fileName = file.name;

      // 임시 URL 생성
      if (!previewUrls[fileName]) {
        const url = URL.createObjectURL(file);
        newPreviewUrls[fileName] = url;
      }
    });

    if (Object.keys(newPreviewUrls).length > 0) {
      setPreviewUrls((prev) => ({ ...prev, ...newPreviewUrls }));
    }

    // Cleanup function
    return () => {
      Object.values(newPreviewUrls).forEach(URL.revokeObjectURL);
    };
  }, [files]);

  // 파일 삭제 처리 함수
  const handleDeleteNewFile = (fileName: string) => {
    setFiles((prev) => prev.filter((f) => f.name !== fileName));

    let newContent = content;
    newContent = newContent.replace(
      new RegExp(`!?\\[${fileName}\\]\\([^)]+\\)\n?`, 'g'),
      ''
    );

    setContent(newContent);

    if (previewUrls[fileName]) {
      URL.revokeObjectURL(previewUrls[fileName]);
      setPreviewUrls((prev) => {
        const newUrls = { ...prev };
        delete newUrls[fileName];
        return newUrls;
      });
    }
  };

  const handleDeleteExistingFile = (fileUrl: string) => {
    setDeletedFileUrls((prev) => [...prev, fileUrl]);

    const fileToDelete = existingFiles.find((f) => f.fileUrl === fileUrl);
    if (fileToDelete) {
      const fileName = fileToDelete.fileName;
      let newContent = content;

      // 파일 이름이 링크의 일부로 포함된 경우를 고려한 정규식
      const imagePattern = new RegExp(
        `!\\[${escapeRegExp(fileName)}\\]\\(/api/download/[^)]+\\)\\s*`,
        'g'
      );
      const filePattern = new RegExp(
        `\\[${escapeRegExp(fileName)}\\]\\(/api/download/[^)]+\\)\\s*`,
        'g'
      );

      // 이미지 파일과 일반 파일 링크 모두 제거
      newContent = newContent
        .replace(imagePattern, '')
        .replace(filePattern, '');

      setContent(newContent);
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop });

  const handleClose = () => {
    setContent('');
    setFiles([]);
    setPreviewUrls({});
    setDeletedFileUrls([]);
    onClose?.();
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    try {
      // 부모 컴포넌트에서 전달받은 onSubmit 함수 호출
      await onSubmit(content, files, deletedFileUrls);

      // 생성 모드일 때만 폼 초기화
      if (mode === 'create') {
        setContent('');
        setFiles([]);
        setPreviewUrls({});
      }

      // 다이얼로그 모드일 때는 닫기
      if (isDialog) {
        handleClose();
      }
    } catch (error) {
      console.error(error);
      alert('메모 저장에 실패했습니다.');
    }
  };

  const formContent = (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {mode === 'create' && (
        <Typography variant='h6' component='h2'>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <AddCircleOutlineIcon sx={{ fontSize: '1.7rem' }} />새 메모
          </Box>
        </Typography>
      )}

      <MarkdownEditor
        value={content}
        onChange={setContent}
        height={isDialog ? '60vh' : '400px'}
      />

      {/* 파일 업로드 영역 */}
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

      {/* 새로 추가된 파일 목록 */}
      {files.length > 0 && (
        <Box sx={{ mt: 2 }}>
          <Typography variant='subtitle2' gutterBottom>
            새로 추가된 파일 ({files.length})
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {files.map((file) => (
              <Box
                key={file.name}
                sx={{
                  p: 1,
                  bgcolor: 'grey.50',
                  borderRadius: 1,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                }}>
                {isImageFile(file.name) ? (
                  <ImageIcon color='primary' />
                ) : (
                  <AttachFileIcon />
                )}
                <Typography sx={{ flex: 1 }}>
                  {file.name} ({(file.size / 1024).toFixed(1)}KB)
                </Typography>
                {previewUrls[file.name] && (
                  <Box sx={{ mt: 1, maxWidth: '200px' }}>
                    <img
                      src={previewUrls[file.name]}
                      alt={file.name}
                      style={{
                        width: '100%',
                        height: 'auto',
                        maxHeight: '50px',
                        borderRadius: '4px',
                      }}
                    />
                  </Box>
                )}
                <IconButton
                  size='small'
                  onClick={() => handleDeleteNewFile(file.name)}
                  color='error'>
                  <DeleteIcon />
                </IconButton>
              </Box>
            ))}
          </Box>
        </Box>
      )}

      {/* 기존 파일 목록 (수정 모드일 때만) */}
      {mode === 'edit' && existingFiles.length > 0 && (
        <Box sx={{ mt: 2 }}>
          <Typography variant='subtitle2' gutterBottom>
            기존 파일 (
            {
              existingFiles.filter(
                (file) => !deletedFileUrls.includes(file.fileUrl)
              ).length
            }
            )
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {existingFiles.map(
              (file, index) =>
                !deletedFileUrls.includes(file.fileUrl) && (
                  <Box
                    key={index}
                    sx={{
                      p: 1,
                      bgcolor: 'grey.50',
                      borderRadius: 1,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1,
                    }}>
                    {isImageFile(file.fileName) ? (
                      <ImageIcon color='primary' />
                    ) : (
                      <AttachFileIcon />
                    )}
                    <Typography sx={{ flex: 1 }}>{file.fileName}</Typography>
                    {isImageFile(file.fileName) && (
                      <Box sx={{ mt: 1, maxWidth: '50px' }}>
                        <img
                          src={file.fileUrl}
                          alt={file.fileName}
                          style={{
                            width: '100%',
                            height: 'auto',
                            borderRadius: '4px',
                          }}
                        />
                      </Box>
                    )}
                    <IconButton
                      size='small'
                      onClick={() => handleDeleteExistingFile(file.fileUrl)}
                      color='error'>
                      <DeleteIcon />
                    </IconButton>
                  </Box>
                )
            )}
          </Box>
        </Box>
      )}

      {!isDialog && (
        <Button
          onClick={handleSubmit}
          variant='contained'
          color='primary'
          sx={{ mt: 2 }}>
          저장
        </Button>
      )}
    </Box>
  );

  if (isDialog) {
    return (
      <Dialog open={true} onClose={handleClose} maxWidth='lg' fullWidth>
        <DialogTitle>
          {mode === 'create' ? '새 메모' : '메모 수정'}
          <IconButton
            aria-label='close'
            onClick={handleClose}
            sx={{
              position: 'absolute',
              right: 8,
              top: 8,
              color: (theme) => theme.palette.grey[500],
            }}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>

        <DialogContent dividers>{formContent}</DialogContent>

        <DialogActions>
          <Button onClick={handleClose}>취소</Button>
          <Button
            onClick={() => handleSubmit()}
            variant='contained'
            color='primary'>
            저장
          </Button>
        </DialogActions>
      </Dialog>
    );
  }

  return (
    <Paper elevation={3} sx={{ p: 3, mb: 4 }}>
      {formContent}
    </Paper>
  );
};

export default MemoForm;
