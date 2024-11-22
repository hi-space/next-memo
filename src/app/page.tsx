// src/app/page.tsx
import { Container, Typography, Box } from '@mui/material';
import MemoList from '@/components/MemoList';

export default function Home() {
  return (
    <Container maxWidth='md' sx={{ py: 4 }}>
      <MemoList />
    </Container>
  );
}
