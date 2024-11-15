export interface FileInfo {
  fileName: string;
  fileUrl: string;
  fileType: string;
}

export interface Memo {
  id: string; // DynamoDB에서 사용하는 파티션 키
  sortKey?: string; // DynamoDB에서 사용하는 정렬 키

  prefix?: string;
  title?: string;
  content: string;
  priority: number;

  files?: FileInfo[]; // 파일 정보 배열
  fileCount?: number; // 전체 파일 개수

  summary?: string;
  tags?: string[];

  createdAt: string;
  updatedAt: string;
}
