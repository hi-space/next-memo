// src/components/LoadingTrigger.tsx
"use client";

import { Box, CircularProgress } from "@mui/material";
import { useInView } from "react-intersection-observer";

interface LoadingTriggerProps {
  onIntersect: () => void;
  loading: boolean;
}

const LoadingTrigger = ({ onIntersect, loading }: LoadingTriggerProps) => {
  const { ref } = useInView({
    onChange: (inView) => {
      // loading 중일 때는 추가 호출하지 않음
      if (inView && !loading) {
        onIntersect();
      }
    },
    threshold: 0,
    rootMargin: "100px",
  });

  return (
    <Box
      ref={ref}
      sx={{
        display: "flex",
        justifyContent: "center",
        py: 2,
        minHeight: "100px",
      }}
    >
      {loading && <CircularProgress />}
    </Box>
  );
};

export default LoadingTrigger;
