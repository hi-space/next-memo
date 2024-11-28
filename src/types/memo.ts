export interface FileInfo {
  fileName: string;
  fileUrl: string;
  fileType: string;
}

export interface Memo {
  id: string; // DynamoDB에서 사용하는 Partition Key (필수)
  gsiPartitionKey?: string; // 고정 값 "ALL", 클라이언트에서 처리 필요 없음

  prefix?: string;
  title?: string;
  content: string;
  priority: number;

  files?: FileInfo[]; // 파일 정보 배열 (기본값: [])
  fileCount?: number; // 전체 파일 개수 (기본값: 0)

  summary?: string;
  tags?: string[];

  createdAt: number; // Unix timestamp
  updatedAt: number; // Unix timestamp
}
