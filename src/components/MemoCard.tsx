// src/components/MemoCard.tsx
import React, { useState } from "react";
import {
  Card,
  CardContent,
  CardMedia,
  Typography,
  Box,
  Link,
  IconButton,
  CardActions,
  Dialog,
  DialogContent,
  DialogActions,
  Button,
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import AttachFileIcon from "@mui/icons-material/AttachFile";
import ImageIcon from "@mui/icons-material/Image";
import { Memo } from "@/types/memo";
import { formatDateTime } from "@/utils/dateFormat";

interface MemoCardProps {
  memo: Memo;
  onEdit: (memo: Memo) => void;
  onDelete: (id: string, createdAt: string) => void;
}

const isImageFile = (fileName: string) => {
  const imageExtensions = ["jpg", "jpeg", "png", "gif", "webp"];
  const extension = fileName.split(".").pop()?.toLowerCase() || "";
  return imageExtensions.includes(extension);
};

const MemoCard = React.memo<MemoCardProps>(({ memo, onEdit, onDelete }) => {
  const [openDialog, setOpenDialog] = useState(false);

  const handleOpenDialog = () => {
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
  };

  return (
    <>
      <Card elevation={2}>
        {memo.fileUrl && isImageFile(memo.fileName || "") ? (
          <CardMedia
            component="img"
            image={memo.fileUrl}
            alt={memo.fileName || "attached image"}
            onClick={handleOpenDialog}
            sx={{
              width: "100%",
              maxHeight: "400px",
              borderRadius: 1,
              mt: 1,
              cursor: "pointer",
            }}
          />
        ) : null}

        <CardContent>
          <Typography variant="body1" sx={{ whiteSpace: "pre-wrap", mb: 2 }}>
            {memo.content}
          </Typography>
          {memo.fileUrl && (
            <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
              {isImageFile(memo.fileName || "") ? (
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <ImageIcon fontSize="small" color="primary" />
                  <Link
                    href={memo.fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {memo.fileName}
                  </Link>
                </Box>
              ) : (
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <AttachFileIcon fontSize="small" />
                  <Link
                    href={memo.fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {memo.fileName}
                  </Link>
                </Box>
              )}
            </Box>
          )}
          <Typography
            variant="caption"
            color="textSecondary"
            sx={{ mt: 2, display: "block" }}
          >
            {formatDateTime(memo.createdAt)}
          </Typography>
        </CardContent>
        <CardActions disableSpacing>
          <IconButton aria-label="edit memo" onClick={() => onEdit(memo)}>
            <EditIcon />
          </IconButton>
          <IconButton
            aria-label="delete memo"
            onClick={() => onDelete(memo.id, memo.createdAt)}
            sx={{ marginLeft: "auto" }}
          >
            <DeleteIcon />
          </IconButton>
        </CardActions>
      </Card>

      {/* 확대 모달 Dialog */}
      <Dialog
        open={openDialog}
        onClose={handleCloseDialog}
        maxWidth="md"
        fullWidth
      >
        <DialogContent sx={{ p: 2 }}>
          {/* 이미지 */}
          {memo.fileUrl && isImageFile(memo.fileName || "") && (
            <img
              src={memo.fileUrl}
              alt={memo.fileName || "Expanded image"}
              style={{
                width: "100%",
                height: "auto",
                borderRadius: "8px",
                marginBottom: "16px",
              }}
            />
          )}
          {/* 메모 내용 */}
          <Typography variant="body1" sx={{ whiteSpace: "pre-wrap", mb: 2 }}>
            {memo.content}
          </Typography>
          {/* 메모 작성 날짜 */}
          <Typography variant="caption" color="textSecondary">
            {formatDateTime(memo.createdAt)}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button
            variant="outlined"
            color="primary"
            onClick={() => {
              onEdit(memo);
              handleCloseDialog();
            }}
          >
            편집
          </Button>
          <Button
            variant="outlined"
            color="error"
            onClick={() => {
              onDelete(memo.id, memo.createdAt);
              handleCloseDialog();
            }}
          >
            삭제
          </Button>
          <Button onClick={handleCloseDialog}>닫기</Button>
        </DialogActions>
      </Dialog>
    </>
  );
});

export default MemoCard;
