import { Container, Typography } from "@mui/material";
import MemoList from "@/components/MemoList";
import MemoForm from "@/components/MemoForm";

export default function Home() {
  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        <img
          src="/next-memo.png"
          alt="NEXT MEMO"
          height="80"
          style={{ borderRadius: "8px" }}
        />
      </Typography>
      <MemoForm />
      <MemoList />
    </Container>
  );
}
