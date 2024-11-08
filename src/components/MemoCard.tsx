// src/components/MemoCard.tsx
import React from "react";
import {
  Card,
  CardContent,
  CardMedia,
  Typography,
  Box,
  Link,
  IconButton,
  CardActions,
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
  return (
    <Card elevation={2}>
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
  );
});

MemoCard.displayName = "MemoCard";

export default MemoCard;
