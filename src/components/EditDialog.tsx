// src/components/EditDialog.tsx
"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Box,
  Typography,
} from "@mui/material";
import AttachFileIcon from "@mui/icons-material/AttachFile";
import { Memo } from "@/types/memo";

interface EditDialogProps {
  open: boolean;
  memo: Memo | null;
  onClose: () => void;
  onSave: (content: string, file: File | null) => void;
}

const EditDialog: React.FC<EditDialogProps> = ({
  open,
  memo,
  onClose,
  onSave,
}) => {
  const [content, setContent] = useState("");
  const [file, setFile] = useState<File | null>(null);

  useEffect(() => {
    if (memo) {
      setContent(memo.content);
      setFile(null);
    }
  }, [memo]);

  const handleSave = () => {
    onSave(content, file);
    onClose();
  };

  const handleClose = () => {
    setContent("");
    setFile(null);
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>메모 수정</DialogTitle>
      <DialogContent>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2, mt: 2 }}>
          <TextField
            multiline
            rows={4}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            label="메모 내용"
            fullWidth
          />
          <Button
            variant="outlined"
            component="label"
            startIcon={<AttachFileIcon />}
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
              새로 선택된 파일: {file.name}
            </Typography>
          )}
          {memo?.fileName && !file && (
            <Typography variant="body2" color="textSecondary">
              현재 파일: {memo.fileName}
            </Typography>
          )}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>취소</Button>
        <Button onClick={handleSave} variant="contained">
          저장
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default EditDialog;
