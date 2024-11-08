// src/components/MemoCard.tsx
import React, { useState } from "react";
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
  DialogContent,
  DialogActions,
  Button,
} from "@mui/material";
import { styled } from "@mui/material/styles";
import { IconButtonProps } from "@mui/material/IconButton";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import AttachFileIcon from "@mui/icons-material/AttachFile";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ImageIcon from "@mui/icons-material/Image";
import { Memo } from "@/types/memo";
import { formatDateTime } from "@/utils/dateFormat";

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
  marginLeft: "auto",
  transition: theme.transitions.create("transform", {
    duration: theme.transitions.duration.shortest,
  }),
  variants: [
    {
      props: ({ expand }) => !expand,
      style: {
        transform: "rotate(0deg)",
      },
    },
    {
      props: ({ expand }) => !!expand,
      style: {
        transform: "rotate(180deg)",
      },
    },
  ],
}));

const isImageFile = (fileName: string) => {
  const imageExtensions = ["jpg", "jpeg", "png", "gif", "webp"];
  const extension = fileName.split(".").pop()?.toLowerCase() || "";
  return imageExtensions.includes(extension);
};

const MemoCard = React.memo<MemoCardProps>(({ memo, onEdit, onDelete }) => {
  const [openDialog, setOpenDialog] = useState(false);
  const [expanded, setExpanded] = React.useState(false);

  const handleOpenDialog = () => {
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
  };

  const handleExpandClick = () => {
    setExpanded(!expanded);
  };

  return (
    <>
      <Card
        elevation={2}
        sx={{
          padding: 1.5,
          transition: "transform 0.3s, box-shadow 0.3s",
          "&:hover": {
            transform: "scale(1.01)",
            boxShadow: 6,
          },
        }}
      >
        {memo.fileUrl && isImageFile(memo.fileName || "") ? (
          <CardMedia
            component="img"
            image={memo.fileUrl}
            alt={memo.fileName || "image"}
            onClick={handleOpenDialog}
            sx={{
              width: "100%",
              maxHeight: "200px",
            }}
          />
        ) : null}

        <CardContent onClick={handleOpenDialog}>
          <Typography variant="body1" sx={{ whiteSpace: "pre-wrap" }}>
            {memo.content}
          </Typography>
        </CardContent>

        <CardActions disableSpacing>
          <Typography
            variant="body2"
            color="textSecondary"
            sx={{ display: "block" }}
          >
            {formatDateTime(memo.createdAt)}
          </Typography>

          <ExpandMore
            expand={expanded}
            onClick={handleExpandClick}
            aria-expanded={expanded}
            aria-label="show more"
          >
            <ExpandMoreIcon />
          </ExpandMore>
        </CardActions>

        <Collapse in={expanded} timeout="auto" unmountOnExit>
          <Box sx={{ p: 1 }}>
            {memo.fileUrl && (
              <Box
                sx={{
                  display: "flex",
                  flexDirection: "column",
                  mb: 2,
                }}
              >
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

            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 1,
              }}
            >
              <Button
                onClick={() => onEdit(memo)}
                variant="outlined"
                color="warning"
                sx={{ flex: 1 }}
              >
                Modify
              </Button>
              <Button
                onClick={() => onDelete(memo.id, memo.createdAt)}
                variant="outlined"
                color="error"
                sx={{ flex: 1 }}
              >
                Delete
              </Button>
            </Box>

            {/* <IconButton aria-label="edit memo" onClick={() => onEdit(memo)}>
              <EditIcon />
            </IconButton>

            <IconButton
              aria-label="delete memo"
              onClick={() => onDelete(memo.id, memo.createdAt)}
              sx={{ marginLeft: "auto" }}
            >
              <DeleteIcon />
            </IconButton> */}
          </Box>
        </Collapse>
      </Card>

      {/* 확대 모달 Dialog */}
      <Dialog
        open={openDialog}
        onClose={handleCloseDialog}
        maxWidth="md"
        fullWidth
        sx={{ p: 2 }}
      >
        <DialogContent sx={{ p: 5 }}>
          {/* 메모 내용 */}
          <Typography variant="body1" sx={{ whiteSpace: "pre-wrap", mb: 2 }}>
            {memo.content}
          </Typography>

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
        </DialogContent>

        <DialogActions>
          <Typography variant="caption" color="textSecondary">
            {formatDateTime(memo.createdAt)}
          </Typography>
          <Button
            variant="outlined"
            color="warning"
            onClick={() => {
              onEdit(memo);
              handleCloseDialog();
            }}
          >
            Modify
          </Button>
          <Button
            variant="outlined"
            color="error"
            onClick={() => {
              onDelete(memo.id, memo.createdAt);
              handleCloseDialog();
            }}
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
});

export default MemoCard;
