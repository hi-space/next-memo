"use client";

import { useEffect } from "react";
import { useAppDispatch, useAppSelector } from "@/hooks/redux";
import { fetchMemos } from "@/store/memoSlice";
import {
  Box,
  Card,
  CardContent,
  Typography,
  Link,
  CircularProgress,
  Alert,
} from "@mui/material";
import AttachFileIcon from "@mui/icons-material/AttachFile";

const MemoList: React.FC = () => {
  const dispatch = useAppDispatch();
  const { memos, loading, error } = useAppSelector((state) => state.memos);

  useEffect(() => {
    dispatch(fetchMemos());
  }, [dispatch]);

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
          <CardContent>
            <Typography variant="body1" sx={{ whiteSpace: "pre-wrap", mb: 2 }}>
              {memo.content}
            </Typography>
            {memo.fileUrl && (
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
            <Typography
              variant="caption"
              color="textSecondary"
              sx={{ mt: 2, display: "block" }}
            >
              {new Date(memo.createdAt).toLocaleString()}
            </Typography>
          </CardContent>
        </Card>
      ))}
    </Box>
  );
};

export default MemoList;
