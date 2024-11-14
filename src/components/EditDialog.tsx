// src/components/EditDialog.tsx
'use client';

import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Button,
  Box,
  Typography,
} from '@mui/material';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import ImageIcon from '@mui/icons-material/Image';
import CloseIcon from '@mui/icons-material/Close';
import DeleteIcon from '@mui/icons-material/Delete';
import { Memo } from '@/types/memo';
import MarkdownEditor from '@/components/MarkdownEditor';

interface EditDialogProps {
  open: boolean;
  memo: Memo | null;
  onClose: () => void;
  onSave: (
    content: string,
    newFiles: File[],
    deletedFileUrls: string[]
  ) => void;
}

const isImageFile = (fileName: string) => {
  const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp'];
  const extension = fileName.split('.').pop()?.toLowerCase() || '';
  return imageExtensions.includes(extension);
};

const EditDialog: React.FC<EditDialogProps> = ({
  open,
  memo,
  onClose,
  onSave,
}) => {
  const [content, setContent] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<{ [key: string]: string }>({});
  const [deletedFileUrls, setDeletedFileUrls] = useState<string[]>([]);

  useEffect(() => {
    if (memo) {
      setContent(memo.content);
      setFiles([]);
      setPreviewUrls({});
      setDeletedFileUrls([]);
    }
  }, [memo]);

  useEffect(() => {
    // 새로 추가된 파일들의 미리보기 URL 생성
    const newPreviewUrls: { [key: string]: string } = {};
    files.forEach((file) => {
      if (isImageFile(file.name) && !previewUrls[file.name]) {
        newPreviewUrls[file.name] = URL.createObjectURL(file);
      }
    });

    setPreviewUrls((prev) => ({ ...prev, ...newPreviewUrls }));

    // Cleanup
    return () => {
      Object.values(newPreviewUrls).forEach(URL.revokeObjectURL);
    };
  }, [files]);

  const handleClose = () => {
    setContent('');
    setFiles([]);
    setPreviewUrls({});
    setDeletedFileUrls([]);
    onClose();
  };

  const handleDeleteExistingFile = (fileUrl: string) => {
    setDeletedFileUrls((prev) => [...prev, fileUrl]);
  };

  const handleDeleteNewFile = (fileName: string) => {
    setFiles((prev) => prev.filter((f) => f.name !== fileName));
    if (previewUrls[fileName]) {
      URL.revokeObjectURL(previewUrls[fileName]);
      setPreviewUrls((prev) => {
        const newUrls = { ...prev };
        delete newUrls[fileName];
        return newUrls;
      });
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles((prev) => [...prev, ...Array.from(e.target.files || [])]);
    }
  };

  const isFileDeleted = (fileUrl: string) => deletedFileUrls.includes(fileUrl);

  {
    console.log(memo);
  }
  return (
    <Dialog open={open} onClose={handleClose} maxWidth='lg' fullWidth>
      <DialogTitle>메모 수정</DialogTitle>
      <IconButton
        aria-label='close'
        onClick={handleClose}
        sx={(theme) => ({
          position: 'absolute',
          right: 8,
          top: 10,
          color: theme.palette.grey[500],
        })}>
        <CloseIcon />
      </IconButton>

      <DialogContent dividers>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <MarkdownEditor value={content} onChange={setContent} height='60vh' />
          {/* 파일 업로드 버튼 */}
          <Button
            variant='outlined'
            component='label'
            startIcon={<AttachFileIcon />}>
            파일 추가
            <input type='file' hidden multiple onChange={handleFileChange} />
          </Button>

          {/* 새로 추가된 파일 목록 */}
          {files.length > 0 && (
            <Box sx={{ mt: 2 }}>
              <Typography variant='subtitle2' gutterBottom>
                새로 추가된 파일 ({files.length})
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                {files.map((file, index) => (
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
                    <Typography sx={{ flex: 1 }}>{file.name}</Typography>
                    <IconButton
                      size='small'
                      onClick={() => handleDeleteNewFile(file.name)}
                      color='error'>
                      <DeleteIcon />
                    </IconButton>

                    {/* 이미지 미리보기 */}
                    {previewUrls[file.name] && (
                      <Box sx={{ mt: 1, maxWidth: '200px' }}>
                        <img
                          src={previewUrls[file.name]}
                          alt={file.name}
                          style={{
                            width: '100%',
                            height: 'auto',
                            borderRadius: '4px',
                          }}
                        />
                      </Box>
                    )}
                  </Box>
                ))}
              </Box>
            </Box>
          )}

          {/* 기존 파일 목록 */}
          {memo?.files && memo?.files.length > 0 && (
            <Box sx={{ mt: 2 }}>
              <Typography variant='subtitle2' gutterBottom>
                기존 파일 ({memo?.files.length})
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                {memo?.files.map(
                  (file, index) =>
                    !isFileDeleted(file.fileUrl) && (
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
                        <Typography sx={{ flex: 1 }}>
                          {file.fileName}
                        </Typography>
                        <IconButton
                          size='small'
                          onClick={() => handleDeleteExistingFile(file.fileUrl)}
                          color='error'>
                          <DeleteIcon />
                        </IconButton>

                        {/* 기존 이미지 표시 */}
                        {isImageFile(file.fileName) && (
                          <Box sx={{ mt: 1, maxWidth: '200px' }}>
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
                      </Box>
                    )
                )}
              </Box>
            </Box>
          )}
        </Box>
      </DialogContent>

      <DialogActions>
        <Button onClick={handleClose}>취소</Button>
        <Button
          onClick={() => onSave(content, files, deletedFileUrls)}
          variant='contained'>
          저장
        </Button>
      </DialogActions>
    </Dialog>
  );
};
export default EditDialog;
