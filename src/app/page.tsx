import { Container, Typography, Box } from "@mui/material";
import MemoList from "@/components/MemoList";
import MemoForm from "@/components/MemoForm";

export default function Home() {
  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        <Box
          sx={{
            height: 80,
            maxWidth: "100%",
            display: "flex",
            justifyContent: "start",
            alignItems: "center",
            overflow: "hidden",
          }}
        >
          <img
            src="/next-memo.png"
            alt="NEXT MEMO"
            style={{
              height: "100%",
              width: "auto",
              maxWidth: "100%",
            }}
          />
        </Box>
      </Typography>
      <MemoForm />
      <MemoList />
    </Container>
  );
}
