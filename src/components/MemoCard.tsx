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
  Divider,
} from "@mui/material";
import { styled } from "@mui/material/styles";
import { IconButtonProps } from "@mui/material/IconButton";
import MarkdownContent from "@/components/MarkdownContent";
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
        elevation={3}
        sx={{
          transition: "transform 0.3s, box-shadow 0.3s",
          "&:hover": {
            transform: "scale(1.01)",
            boxShadow: 6,
          },
          borderRadius: "10px",
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

        <CardContent
          onClick={handleOpenDialog}
          style={{
            maxHeight: "180px", // 원하는 높이 설정
            overflow: "hidden", // 내용이 넘칠 경우 숨기기
            textOverflow: "ellipsis", // 생략 기호 표시
            display: "-webkit-box", // 줄 수 제한을 위한 설정
            WebkitBoxOrient: "vertical", // 수직 방향 설정
            cursor: "pointer",
          }}
        >
          <MarkdownContent content={memo.content} />
        </CardContent>

        <CardActions disableSpacing>
          <Typography
            variant="body2"
            color="textSecondary"
            sx={{ display: "block", ml: 1 }}
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
          {memo.fileUrl && isImageFile(memo.fileName || "") && (
            <img
              src={memo.fileUrl}
              alt={memo.fileName || "image"}
              style={{
                width: "100%",
                height: "auto",
                borderRadius: "8px",
                marginBottom: "16px",
              }}
            />
          )}

          <MarkdownContent content={memo.content} />

          {memo.fileUrl && (
            <Box
              sx={{
                display: "flex",
                flexDirection: "column",
              }}
            >
              <Divider textAlign="center" sx={{ mt: 2, mb: 2 }}>
                첨부파일
              </Divider>

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
