import { Container, Typography } from "@mui/material";
import MemoList from "@/components/MemoList";
import MemoForm from "@/components/MemoForm";

export default function Home() {
  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        메모 앱
      </Typography>
      <MemoForm />
      <MemoList />
    </Container>
  );
}
