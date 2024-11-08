"use client";

import { useState } from "react";
import { useAppDispatch } from "@/hooks/redux";
import { createMemo, fetchMemos } from "@/store/memoSlice";
import {
  Box,
  TextField,
  Button,
  Paper,
  Typography,
  CircularProgress,
} from "@mui/material";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";

const MemoForm: React.FC = () => {
  const [content, setContent] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const dispatch = useAppDispatch();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData();
    formData.append("content", content);
    if (file) {
      formData.append("file", file);
    }

    try {
      await dispatch(createMemo(formData)).unwrap();
      await dispatch(fetchMemos()).unwrap();
      setContent("");
      setFile(null);
    } catch (error) {
      console.error("Failed to create memo:", error);
    }
  };

  return (
    <Paper elevation={3} sx={{ p: 3, mb: 4 }}>
      <Box
        component="form"
        onSubmit={handleSubmit}
        sx={{ display: "flex", flexDirection: "column", gap: 2 }}
      >
        <Typography variant="h6" component="h2" gutterBottom>
          새 메모 작성
        </Typography>
        <TextField
          multiline
          rows={4}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          label="메모 내용"
          required
          fullWidth
        />
        <Button
          variant="outlined"
          component="label"
          startIcon={<CloudUploadIcon />}
          sx={{ mt: 1 }}
        >
          파일 업로드
          <input
            type="file"
            hidden
            onChange={(e) => setFile(e.target.files?.[0] || null)}
          />
        </Button>
        {file && (
          <Typography variant="body2" color="textSecondary">
            선택된 파일: {file.name}
          </Typography>
        )}
        <Button
          type="submit"
          variant="contained"
          color="primary"
          sx={{ mt: 2 }}
        >
          저장
        </Button>
      </Box>
    </Paper>
  );
};

export default MemoForm;
