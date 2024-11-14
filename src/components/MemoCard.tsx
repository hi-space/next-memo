// src/components/MemoCard.tsx
import React, { useState } from 'react';
import {
  Card,
  Collapse,
  CardContent,
  CardMedia,
  Typography,
  Box,
  Link,
  IconButton,
  CardActions,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Divider,
  Chip,
} from '@mui/material';
import { styled } from '@mui/material/styles';
import { IconButtonProps } from '@mui/material/IconButton';
import MarkdownContent from '@/components/MarkdownContent';

import {
  Download as DownloadIcon,
  Image as ImageIcon,
  Close as CloseIcon,
  AttachFile as AttachFileIcon,
  ExpandMore as ExpandMoreIcon,
  Visibility as VisibilityIcon,
} from '@mui/icons-material';

import { Memo } from '@/types/memo';
import { formatDateTime } from '@/utils/dateFormat';

interface MemoCardProps {
  memo: Memo;
  onEdit: (memo: Memo) => void;
  onDelete: (id: string, createdAt: string) => void;
}

interface ExpandMoreProps extends IconButtonProps {
  expand: boolean;
}

const ExpandMore = styled((props: ExpandMoreProps) => {
  const { expand, ...other } = props;
  return <IconButton {...other} />;
})(({ theme }) => ({
  marginLeft: 'auto',
  transition: theme.transitions.create('transform', {
    duration: theme.transitions.duration.shortest,
  }),
  variants: [
    {
      props: ({ expand }) => !expand,
      style: {
        transform: 'rotate(0deg)',
      },
    },
    {
      props: ({ expand }) => !!expand,
      style: {
        transform: 'rotate(180deg)',
      },
    },
  ],
}));

const isImageFile = (fileName: string) => {
  const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp'];
  const extension = fileName.split('.').pop()?.toLowerCase() || '';
  return imageExtensions.includes(extension);
};

const MemoCard = React.memo<MemoCardProps>(({ memo, onEdit, onDelete }) => {
  const [openDialog, setOpenDialog] = useState(false);
  const [expanded, setExpanded] = React.useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  const handleOpenDialog = () => {
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
  };

  const handleExpandClick = () => {
    setExpanded(!expanded);
  };

  // const handleOpenDialog = () => {
  //   setOpenDialog(true);

  //   // 첫 번째 이미지의 URL로 프리뷰 설정
  //   const firstImage = memo.files?.find((file) => isImageFile(file.fileName));
  //   if (firstImage) {
  //     setPreviewImage(firstImage.fileUrl);
  //     setPreviewOpen(true);
  //   }
  // };

  const handlePreviewImage = (imageUrl: string) => {
    setPreviewImage(imageUrl);
    setPreviewOpen(true);
  };

  const handleDownload = async (fileUrl: string, fileName: string) => {
    try {
      const response = await fetch(
        `/api/download?fileUrl=${encodeURIComponent(
          fileUrl
        )}&fileName=${encodeURIComponent(fileName)}`,
        {
          method: 'GET',
        }
      );

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Download failed:', error);
      // 에러 처리
      alert('다운로드가 실패했습니다.');
    }
  };

  const imageFiles =
    memo.files?.filter((file) => isImageFile(file.fileName)) || [];

  return (
    <>
      <Card
        elevation={3}
        sx={{
          transition: 'transform 0.3s, box-shadow 0.3s',
          '&:hover': {
            transform: 'scale(1.01)',
            boxShadow: 6,
          },
          borderRadius: '10px',
        }}>
        {/* 이미지 미리보기 영역 */}
        {imageFiles.length > 0 && (
          <Box sx={{ position: 'relative' }}>
            <CardMedia
              component='img'
              image={imageFiles[0].fileUrl}
              alt={imageFiles[0].fileName}
              onClick={handleOpenDialog}
              sx={{
                width: '100%',
                maxHeight: '200px',
                cursor: 'pointer',
              }}
            />
            {imageFiles.length > 1 && (
              <Box
                sx={{
                  position: 'absolute',
                  top: 8,
                  right: 8,
                  bgcolor: 'rgba(0, 0, 0, 0.6)',
                  color: 'white',
                  px: 1,
                  py: 0.5,
                  borderRadius: 1,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 0.5,
                }}>
                <ImageIcon fontSize='small' />
                <Typography variant='body2'>{imageFiles.length}</Typography>
              </Box>
            )}
          </Box>
        )}

        <CardContent
          onClick={handleOpenDialog}
          style={{
            maxHeight: '180px',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            display: '-webkit-box',
            WebkitBoxOrient: 'vertical',
            cursor: 'pointer',
          }}>
          <MarkdownContent content={memo.content} />
        </CardContent>

        <CardActions disableSpacing>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, ml: 1 }}>
            <Typography variant='body2' color='textSecondary'>
              {formatDateTime(memo.createdAt)}
            </Typography>
            {memo.files && memo.files.length > 0 && (
              <Chip
                size='small'
                icon={<AttachFileIcon />}
                label={`${memo.fileCount || memo.files.length} files`}
                variant='outlined'
              />
            )}
          </Box>

          <ExpandMore
            expand={expanded}
            onClick={handleExpandClick}
            aria-expanded={expanded}
            aria-label='show more'>
            <ExpandMoreIcon />
          </ExpandMore>
        </CardActions>

        <Collapse in={expanded} timeout='auto' unmountOnExit>
          <Box sx={{ p: 1 }}>
            {/* 첨부 파일 목록 */}
            {memo.files && memo.files.length > 0 && (
              <Box sx={{ mb: 2 }}>
                <Typography variant='subtitle2' sx={{ mb: 1 }}>
                  Attachments ({memo.fileCount || memo.files.length})
                </Typography>
                <Box
                  sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 1,
                    maxHeight: '200px',
                    overflowY: 'auto',
                  }}>
                  {memo.files.map((file, index) => (
                    <Box
                      key={index}
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1,
                        p: 1,
                        bgcolor: 'grey.50',
                        borderRadius: 1,
                      }}>
                      {isImageFile(file.fileName) ? (
                        <>
                          <ImageIcon fontSize='small' color='primary' />
                          <Box
                            sx={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 1,
                              flex: 1,
                            }}>
                            <Link
                              href={file.fileUrl}
                              target='_blank'
                              rel='noopener noreferrer'
                              sx={{
                                flex: 1,
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                              }}>
                              {file.fileName}
                            </Link>
                            <IconButton
                              size='small'
                              onClick={() => handlePreviewImage(file.fileUrl)}
                              sx={{ ml: 'auto' }}>
                              <VisibilityIcon fontSize='small' />
                            </IconButton>
                          </Box>
                        </>
                      ) : (
                        <>
                          <AttachFileIcon fontSize='small' />
                          <Link
                            href={file.fileUrl}
                            target='_blank'
                            rel='noopener noreferrer'
                            sx={{
                              flex: 1,
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}>
                            {file.fileName}
                          </Link>
                        </>
                      )}
                    </Box>
                  ))}
                </Box>
              </Box>
            )}

            {/* 수정/삭제 버튼 */}
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 1,
              }}>
              <Button
                onClick={() => onEdit(memo)}
                variant='outlined'
                color='warning'
                sx={{ flex: 1 }}>
                Modify
              </Button>
              <Button
                onClick={() => onDelete(memo.id, memo.createdAt)}
                variant='outlined'
                color='error'
                sx={{ flex: 1 }}>
                Delete
              </Button>
            </Box>
          </Box>
        </Collapse>

        {/* 이미지 미리보기 다이얼로그 */}
        <Dialog
          open={previewOpen}
          onClose={() => setPreviewOpen(false)}
          maxWidth='md'
          fullWidth>
          <DialogContent sx={{ p: 0 }}>
            {previewImage && (
              <img
                src={previewImage}
                alt='Preview'
                style={{ width: '100%', height: 'auto' }}
              />
            )}
          </DialogContent>
        </Dialog>
      </Card>

      {/* 아이템 상세보기 Dialog */}
      <Dialog
        open={openDialog}
        onClose={handleCloseDialog}
        maxWidth='lg'
        fullWidth>
        <DialogTitle>
          <Typography variant='body2' color='textSecondary'>
            {formatDateTime(memo.createdAt)}
          </Typography>
        </DialogTitle>
        <IconButton
          aria-label='close'
          onClick={handleCloseDialog}
          sx={(theme) => ({
            position: 'absolute',
            right: 8,
            top: 8,
            color: theme.palette.grey[500],
          })}>
          <CloseIcon />
        </IconButton>

        <DialogContent dividers>
          {/* 이미지 파일들 먼저 표시 */}
          {memo.files &&
            memo.files.filter((file) => isImageFile(file.fileName)).length >
              0 && (
              <Box sx={{ mb: 3 }}>
                {memo.files
                  .filter((file) => isImageFile(file.fileName))
                  .map((file, index) => (
                    <img
                      key={index}
                      src={file.fileUrl}
                      alt={file.fileName}
                      style={{
                        width: '100%',
                        height: 'auto',
                        borderRadius: '8px',
                        marginBottom: '16px',
                      }}
                    />
                  ))}
              </Box>
            )}

          <MarkdownContent content={memo.content} />

          {/* 첨부 파일 목록 */}
          {memo.files && memo.files.length > 0 && (
            <Box sx={{ display: 'flex', flexDirection: 'column' }}>
              <Divider textAlign='center' sx={{ mt: 2, mb: 2 }}>
                첨부 파일 ({memo.fileCount || memo.files.length})
              </Divider>

              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                {memo.files.map((file, index) => (
                  <Box
                    key={index}
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1,
                      p: 1,
                      bgcolor: 'grey.50',
                      borderRadius: 1,
                    }}>
                    {isImageFile(file.fileName) ? (
                      <>
                        <ImageIcon fontSize='small' color='primary' />
                        <Box
                          sx={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 1,
                            flex: 1,
                          }}>
                          <Link
                            href={file.fileUrl}
                            target='_blank'
                            rel='noopener noreferrer'
                            sx={{
                              flex: 1,
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}>
                            {file.fileName}
                          </Link>
                          <Box
                            sx={{ mt: 1, maxWidth: '50px' }}
                            onClick={() => handlePreviewImage(file.fileUrl)}>
                            <img
                              src={file.fileUrl}
                              alt={file.fileName}
                              style={{
                                width: '100%',
                                height: 'auto',
                                borderRadius: '4px',
                                cursor: 'pointer',
                              }}
                            />
                          </Box>
                        </Box>
                      </>
                    ) : (
                      <>
                        <AttachFileIcon fontSize='small' />
                        <Link
                          href={file.fileUrl}
                          target='_blank'
                          rel='noopener noreferrer'
                          sx={{
                            flex: 1,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}>
                          {file.fileName}
                        </Link>
                      </>
                    )}

                    <IconButton
                      size='small'
                      onClick={async (e) => {
                        e.stopPropagation(); // 이벤트 버블링 방지
                        await handleDownload(file.fileUrl, file.fileName);
                      }}
                      sx={{ ml: 'auto' }}>
                      <DownloadIcon fontSize='small' />
                    </IconButton>
                  </Box>
                ))}
              </Box>
            </Box>
          )}
        </DialogContent>

        <DialogActions>
          <Typography variant='caption' color='textSecondary' sx={{ ml: 1 }}>
            {formatDateTime(memo.updatedAt)}
          </Typography>
          <Button
            variant='outlined'
            color='warning'
            onClick={() => {
              onEdit(memo);
              handleCloseDialog();
            }}>
            Modify
          </Button>
          <Button
            variant='outlined'
            color='error'
            onClick={() => {
              onDelete(memo.id, memo.createdAt);
              handleCloseDialog();
            }}>
            Delete
          </Button>
        </DialogActions>

        {/* 이미지 미리보기 다이얼로그 */}
        <Dialog
          open={previewOpen}
          onClose={() => setPreviewOpen(false)}
          maxWidth='md'
          fullWidth>
          <DialogContent sx={{ p: 0 }}>
            {previewImage && (
              <img
                src={previewImage}
                alt='Preview'
                style={{ width: '100%', height: 'auto' }}
              />
            )}
          </DialogContent>
        </Dialog>
      </Dialog>
    </>
  );
});

export default MemoCard;
