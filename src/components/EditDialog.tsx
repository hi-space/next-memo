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
import ImageIcon from "@mui/icons-material/Image";
import MdEditor from "react-markdown-editor-lite";
import MarkdownIt from "markdown-it";
import "react-markdown-editor-lite/lib/index.css";
import { Memo } from "@/types/memo";

interface EditDialogProps {
  open: boolean;
  memo: Memo | null;
  onClose: () => void;
  onSave: (content: string, file: File | null) => void;
}

const isImageFile = (fileName: string) => {
  const imageExtensions = ["jpg", "jpeg", "png", "gif", "webp"];
  const extension = fileName.split(".").pop()?.toLowerCase() || "";
  return imageExtensions.includes(extension);
};

const mdParser = new MarkdownIt();

const EditDialog: React.FC<EditDialogProps> = ({
  open,
  memo,
  onClose,
  onSave,
}) => {
  const [content, setContent] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isFileDeleted, setIsFileDeleted] = useState(false);

  useEffect(() => {
    if (memo) {
      setContent(memo.content);
      setFile(null);
      setPreviewUrl(null);
      setIsFileDeleted(false);
    }
  }, [memo]);

  useEffect(() => {
    if (file && isImageFile(file.name)) {
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
      return () => URL.revokeObjectURL(url);
    }
  }, [file]);

  const handleEditorChange = ({ text }: { text: string }) => {
    setContent(text);
  };

  const handleClose = () => {
    setContent("");
    setFile(null);
    setPreviewUrl(null);
    setIsFileDeleted(false);
    onClose();
  };

  const handleDeleteFile = () => {
    setFile(null);
    setPreviewUrl(null);
    setIsFileDeleted(true);
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="lg" fullWidth>
      <DialogTitle>메모 수정</DialogTitle>
      <DialogContent>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2, mt: 2 }}>
          <MdEditor
            value={content}
            style={{ height: "300px" }}
            renderHTML={(text) => mdParser.render(text)}
            onChange={handleEditorChange}
          />

          <Button
            variant="outlined"
            component="label"
            startIcon={
              file && isImageFile(file.name) ? (
                <ImageIcon />
              ) : (
                <AttachFileIcon />
              )
            }
          >
            업로드
            <input
              type="file"
              hidden
              onChange={(e) => {
                setFile(e.target.files?.[0] || null);
                setIsFileDeleted(false);
              }}
            />
          </Button>
          {file && (
            <Typography variant="body2" color="textSecondary">
              새로 선택된 파일: {file.name}
            </Typography>
          )}
          {previewUrl && (
            <Box
              sx={{
                mt: 1,
                position: "relative",
                width: "100%",
                maxWidth: "400px",
                "& img": {
                  width: "100%",
                  height: "auto",
                  borderRadius: 1,
                },
              }}
            >
              <img src={previewUrl} alt="Preview" />
            </Box>
          )}
          {!file && !isFileDeleted && memo?.fileName && (
            <>
              <Typography variant="body2" color="textSecondary">
                현재 파일: {memo.fileName}
              </Typography>
              {memo.fileUrl && isImageFile(memo.fileName) && (
                <Box
                  sx={{
                    mt: 1,
                    position: "relative",
                    width: "100%",
                    maxWidth: "400px",
                    "& img": {
                      width: "100%",
                      height: "auto",
                      borderRadius: 1,
                    },
                  }}
                >
                  <img src={memo.fileUrl} alt={memo.fileName} />
                </Box>
              )}
              <Button
                color="error"
                variant="outlined"
                onClick={handleDeleteFile}
              >
                파일 삭제
              </Button>
            </>
          )}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>취소</Button>
        <Button
          onClick={() => onSave(content, isFileDeleted ? null : file)}
          variant="contained"
        >
          저장
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default EditDialog;
