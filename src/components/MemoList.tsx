// src/components/MemoList.tsx
"use client";

import { useState, useEffect } from "react";
import { useAppDispatch, useAppSelector } from "@/hooks/redux";
import { fetchMemos, deleteMemo, updateMemo } from "@/store/memoSlice";
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
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import AttachFileIcon from "@mui/icons-material/AttachFile";
import ImageIcon from "@mui/icons-material/Image";
import EditDialog from "./EditDialog";
import { Memo } from "@/types/memo";

const isImageFile = (fileName: string) => {
  const imageExtensions = ["jpg", "jpeg", "png", "gif", "webp"];
  const extension = fileName.split(".").pop()?.toLowerCase() || "";
  return imageExtensions.includes(extension);
};

const MemoList: React.FC = () => {
  const dispatch = useAppDispatch();
  const { memos, loading, error } = useAppSelector((state) => state.memos);
  const [editingMemo, setEditingMemo] = useState<Memo | null>(null);

  const handleEdit = async (content: string, file: File | null) => {
    if (!editingMemo) return;

    const formData = new FormData();
    formData.append("content", content);
    if (file) {
      formData.append("file", file);
    }

    try {
      await dispatch(updateMemo({ id: editingMemo.id, formData })).unwrap();
      await dispatch(fetchMemos()).unwrap();
    } catch (error) {
      console.error("Failed to update memo:", error);
    }
  };

  useEffect(() => {
    dispatch(fetchMemos());
    const interval = setInterval(() => {
      dispatch(fetchMemos());
    }, 30 * 60 * 1000); // 30분

    return () => clearInterval(interval);
  }, [dispatch]);

  const handleDelete = async (id: string) => {
    if (window.confirm("정말 이 메모를 삭제하시겠습니까?")) {
      try {
        await dispatch(deleteMemo(id)).unwrap();
      } catch (error) {
        console.error("Failed to delete memo:", error);
      }
    }
  };

  if (loading) {
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
        <Card key={memo.id} elevation={2}>
          {memo.fileUrl && isImageFile(memo.fileName || "") ? (
            <CardMedia
              component="img"
              image={memo.fileUrl}
              alt={memo.fileName || "attached image"}
              sx={{
                width: "100%",
                borderRadius: 1,
                mt: 1,
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
                  <>
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
                  </>
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
              {new Date(memo.createdAt).toLocaleString()}
            </Typography>
          </CardContent>
          <CardActions disableSpacing>
            <IconButton
              aria-label="edit memo"
              onClick={() => setEditingMemo(memo)}
            >
              <EditIcon />
            </IconButton>
            <IconButton
              aria-label="delete memo"
              onClick={() => handleDelete(memo.id)}
              sx={{ marginLeft: "auto" }}
            >
              <DeleteIcon />
            </IconButton>
          </CardActions>
        </Card>
      ))}

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
