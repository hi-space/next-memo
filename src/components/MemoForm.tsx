"use client";

import { useState } from "react";
import { useAppDispatch } from "@/hooks/redux";
import { createMemo, fetchMemos, resetMemos } from "@/store/memoSlice";
import {
  Box,
  TextField,
  Button,
  Paper,
  Typography,
  CircularProgress,
} from "@mui/material";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import AddCircleOutlineIcon from "@mui/icons-material/AddCircleOutline";
import MarkdownEditor from "@/components/MarkdownEditor";

const MemoForm: React.FC = () => {
  const [content, setContent] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const dispatch = useAppDispatch();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const formData = new FormData();
      formData.append("content", content);
      if (file) {
        formData.append("file", file);
      }

      await dispatch(createMemo(formData)).unwrap();
      dispatch(resetMemos()); // 목록 리셋
      dispatch(fetchMemos()); // 다시 로딩
      setContent("");
      setFile(null);
    } catch (error) {
      console.error(error);
      alert("메모 작성에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Paper elevation={3} sx={{ p: 3, mb: 4 }}>
      <Box
        component="form"
        onSubmit={handleSubmit}
        sx={{ display: "flex", flexDirection: "column", gap: 2 }}
      >
        <Typography variant="h6" component="h2">
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <AddCircleOutlineIcon sx={{ fontSize: "1.7rem" }} />새 메모
          </Box>
        </Typography>

        <MarkdownEditor value={content} onChange={setContent} height="400px" />

        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "flex-end",
            gap: 2,
          }}
        >
          <Button
            variant="outlined"
            component="label"
            startIcon={<CloudUploadIcon />}
            sx={{ flex: 1 }}
          >
            업로드
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
            sx={{ flex: 1 }}
          >
            저장
          </Button>
        </Box>
      </Box>
    </Paper>
  );
};

export default MemoForm;
